#!/usr/bin/env python3
"""
transcript_audit.py — strict verifier for Medhavi Skills University academic transcripts.

Parses transcript PDFs (up to ~500 at a time), recomputes every published figure from the
course rows, and writes a multi-sheet Excel audit report.

What it checks
--------------
  1. Category wording (must be exactly one of the three canonical strings)
  2. Semester set + strict sequence, driven by programme (BVoc=6, BDes=8) and category
  3. Per-course grade vs marks (grade scale on page 2 of the transcript)
  4. Per-course credit = T + P + PR ; per-semester printed CREDITS = sum of course credits
  5. Per-semester SGPA = Sum(credit_i * gradepoint_i) / Sum(credit_i)
  6. MAX MARKS = number of distinct course rows * 100
  7. OBTAINED MARKS = sum of all course marks
  8. PERCENTAGE = obtained / max * 100
  9. TOTAL CREDITS = sum of semester credits
 10. CGPA = Sum over all courses(credit * gradepoint) / total credits
     (plus a cross-check against the Sum(Ci*Si)/Sum(Ci) form printed on page 2)

All arithmetic uses decimal.Decimal — no binary floating point — so comparisons are exact.

Usage
-----
    python transcript_audit.py INPUT [INPUT ...] -o report.xlsx
    python transcript_audit.py ./transcripts -o audit.xlsx --workers 8
    python transcript_audit.py ./transcripts -o audit.xlsx --json results.json

Dependencies: pdfplumber, openpyxl   (pip install pdfplumber openpyxl)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import traceback
from dataclasses import dataclass, field, asdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP, getcontext
from pathlib import Path
from typing import Any

getcontext().prec = 28

VERSION = "1.0.0"

# --------------------------------------------------------------------------------------
# CONFIGURATION — edit these constants to change the rules
# --------------------------------------------------------------------------------------

# Grade scale, taken from "Details of Grade and Grade Point Average" (page 2).
# (low_mark, high_mark, grade, grade_point)
GRADE_SCALE: list[tuple[int, int, str, int]] = [
    (99, 100, "O", 10),
    (90, 98, "A+", 9),
    (80, 89, "A", 8),
    (70, 79, "B+", 7),
    (60, 69, "B", 6),
    (50, 59, "C", 5),
    (40, 49, "P", 4),
    (0, 39, "F", 0),
]
ABSENT_GRADE = "AB"          # marks recorded as "AB"
ABSENT_POINT = 0
PASSING_MARK = 40

# The ONLY acceptable spellings of Category.
CANONICAL_CATEGORIES = {
    "REGULAR": "Regular",
    "LATERAL_2": "Lateral Entry to Second Year",
    "LATERAL_3": "Lateral Entry to Third Year",
}

# Patterns used to work out what the writer *meant* when the wording is wrong,
# so the rest of the checks can still run.
CATEGORY_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("LATERAL_2", re.compile(r"lateral.*(2nd|2\b|second)", re.I)),
    ("LATERAL_3", re.compile(r"lateral.*(3rd|3\b|third)", re.I)),
    ("REGULAR", re.compile(r"^\s*(regular|regural)\s*$", re.I)),
]

# Programme -> total number of semesters
PROGRAMME_PATTERNS: list[tuple[str, int, re.Pattern]] = [
    ("BVOC", 6, re.compile(r"bachelor\s+of\s+vocation|b\.?\s?voc", re.I)),
    ("BDES", 8, re.compile(r"bachelor\s+of\s+design|b\.?\s?des", re.I)),
]

# Category -> first semester that must appear
FIRST_SEMESTER = {"REGULAR": 1, "LATERAL_2": 3, "LATERAL_3": 5}

# Rounding: every published figure is printed to 1 decimal place.
SGPA_DP = Decimal("0.1")
CGPA_DP = Decimal("0.1")
PCT_DP = Decimal("0.1")

SEM_WORDS = {
    "FIRST": 1, "SECOND": 2, "THIRD": 3, "FOURTH": 4,
    "FIFTH": 5, "SIXTH": 6, "SEVENTH": 7, "EIGHTH": 8,
}
SEM_NAME = {v: k.capitalize() for k, v in SEM_WORDS.items()}

# Roman numerals, for layouts that print "SEMESTER - IV" instead of "FOURTH SEMESTER"
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}


def _semester_number_at(tokens: list[str], i: int) -> int | None:
    """
    Given that tokens[i] is the word SEMESTER, work out which semester it is.
    Handles: 'FIFTH SEMESTER', 'SEMESTER V', 'SEMESTER - 5', 'SEMESTER: FIFTH'.
    """
    def clean(t: str) -> str:
        return t.strip(" -:.()").upper()

    before = clean(tokens[i - 1]) if i > 0 else ""
    after = clean(tokens[i + 1]) if i + 1 < len(tokens) else ""
    after2 = clean(tokens[i + 2]) if i + 2 < len(tokens) else ""

    for cand in (before, after, after2):
        if not cand:
            continue
        if cand in SEM_WORDS:
            return SEM_WORDS[cand]
        if cand in ROMAN:
            return ROMAN[cand]
        if cand.isdigit() and 1 <= int(cand) <= 8:
            return int(cand)
    return None

HEADER_LABELS = [
    "Name of the Student", "Father's Name", "Mother's Name", "Registration No.",
    "Roll No.", "Category", "Year of Passing", "Programme", "Specialization",
    "Enrollment No.", "School",
]

COURSE_CODE_RE = re.compile(r"^[A-Z]{2,5}\d{3}[A-Z]?$")
CREDIT_TRIPLE_RE = re.compile(r"^\d{1,2}-\d{1,2}-\d{1,2}$")
MARKS_RE = re.compile(r"^(\d{1,3}|AB|ab|Ab)$")
GRADE_RE = re.compile(r"^(O|A\+|A|B\+|B|C|P|F|AB)$")


def dec(x) -> Decimal:
    return Decimal(str(x))


def q(x: Decimal, exp: Decimal) -> Decimal:
    """Round half-up to the given exponent (0.1 -> one decimal place)."""
    return x.quantize(exp, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------------------
# DATA MODEL
# --------------------------------------------------------------------------------------

@dataclass
class Issue:
    code: str
    severity: str            # ERROR | WARNING | INFO
    location: str            # e.g. "Semester 5 / FDL301" or "Header"
    message: str
    printed: str = ""
    computed: str = ""

    def as_row(self) -> list[str]:
        return [self.severity, self.code, self.location, self.message, self.printed, self.computed]


@dataclass
class Course:
    code: str
    name: str
    credit_triple: str
    theory: int
    practical: int
    practice: int
    marks_raw: str
    grade_printed: str
    line_no: int = 0

    @property
    def credit(self) -> int:
        return self.theory + self.practical + self.practice

    @property
    def is_absent(self) -> bool:
        return self.marks_raw.upper() == ABSENT_GRADE

    @property
    def marks(self) -> int | None:
        if self.is_absent:
            return 0
        try:
            return int(self.marks_raw)
        except (TypeError, ValueError):
            return None


@dataclass
class Semester:
    number: int
    courses: list[Course] = field(default_factory=list)
    credits_printed: int | None = None
    sgpa_printed: str | None = None


@dataclass
class Transcript:
    file: str
    student: str = ""
    father: str = ""
    mother: str = ""
    reg_no: str = ""
    category_printed: str = ""
    programme_printed: str = ""
    specialization: str = ""
    year_of_passing: str = ""
    semesters: dict[int, Semester] = field(default_factory=dict)
    max_marks_printed: int | None = None
    obtained_printed: int | None = None
    percentage_printed: str | None = None
    total_credits_printed: int | None = None
    cgpa_printed: str | None = None
    parse_errors: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------------------
# PARSING
# --------------------------------------------------------------------------------------

def _lines(words: list[dict], tol: float = 3.0) -> list[tuple[float, list[dict]]]:
    """Cluster pdfplumber words into visual lines by their vertical position."""
    buckets: list[list] = []
    for w in sorted(words, key=lambda w: (round(w["top"], 1), w["x0"])):
        if buckets and abs(w["top"] - buckets[-1][0]) <= tol:
            buckets[-1][1].append(w)
        else:
            buckets.append([w["top"], [w]])
    return [(t, sorted(ws, key=lambda w: w["x0"])) for t, ws in buckets]


def _grab_header_fields(text: str) -> dict[str, str]:
    """Pull 'Label : value' pairs out of the header block, column layout and all."""
    out: dict[str, str] = {}
    label_re = re.compile(
        r"(" + "|".join(re.escape(l) for l in HEADER_LABELS) + r")\s*:\s*"
    )
    for line in text.splitlines():
        hits = list(label_re.finditer(line))
        if not hits:
            continue
        for i, m in enumerate(hits):
            start = m.end()
            end = hits[i + 1].start() if i + 1 < len(hits) else len(line)
            value = line[start:end].strip()
            # a trailing all-caps school banner shares the line with the middle column
            value = re.sub(r"\s*SCHOOL OF [A-Z &]+\s*$", "", value).strip()
            value = value.strip(" :|")
            if value and m.group(1) not in out:
                out[m.group(1)] = value
    return out


def _parse_course_line(toks: list[str], line_no: int) -> Course | None:
    """A course row is any line carrying a T-P-PR credit triple."""
    idx = [i for i, t in enumerate(toks) if CREDIT_TRIPLE_RE.match(t)]
    if not idx:
        return None
    i = idx[0]
    left = toks[:i]
    right = toks[i + 1:]
    code = next((t for t in left if COURSE_CODE_RE.match(t)), "")
    name = " ".join(t for t in left if t != code).strip()
    marks_raw = right[0] if right else ""
    grade = right[1] if len(right) > 1 else ""
    # occasional wrapped grade: "B" and "+" split into two tokens
    if len(right) > 2 and right[2] == "+" and grade in {"A", "B"}:
        grade = grade + "+"
    t, p, pr = (int(x) for x in toks[i].split("-"))
    return Course(code=code, name=name, credit_triple=toks[i], theory=t, practical=p,
                  practice=pr, marks_raw=marks_raw, grade_printed=grade, line_no=line_no)


def parse_pdf(path: str) -> Transcript:
    import pdfplumber

    tr = Transcript(file=os.path.basename(path))
    full_text_parts: list[str] = []

    with pdfplumber.open(path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            words = page.extract_words()
            page_text = page.extract_text() or ""
            full_text_parts.append(page_text)
            mid = page.width / 2.0

            # ---- locate semester headers (usually two side-by-side columns) ----
            heads: list[tuple[int, str, float]] = []
            for _t, ws in _lines(words):
                toks = [w["text"] for w in ws]
                for i, w in enumerate(ws):
                    if w["text"].strip(" -:.").upper() != "SEMESTER":
                        continue
                    num = _semester_number_at(toks, i)
                    if num is not None:
                        col = "L" if w["x0"] < mid else "R"
                        heads.append((num, col, w["top"]))

            # Some transcripts use one full-width column. If every header sits on the
            # left, treat the page as single-column so right-hand words are not dropped.
            right_has_courses = any(
                CREDIT_TRIPLE_RE.match(w["text"]) and w["x0"] >= mid for w in words
            )
            single_column = bool(heads) and all(h[1] == "L" for h in heads) and not right_has_courses
            if single_column:
                mid = page.width * 2  # every word counts as "left"

            for num, col, top in heads:
                same_col_below = [h[2] for h in heads if h[1] == col and h[2] > top + 3]
                limit = min(same_col_below) if same_col_below else float("inf")
                colw = [
                    w for w in words
                    if ((w["x0"] < mid) == (col == "L"))
                    and w["top"] > top + 3 and w["top"] < limit
                ]

                sem = tr.semesters.get(num) or Semester(number=num)
                if num in tr.semesters:
                    tr.parse_errors.append(f"Semester {num} block appears more than once")

                pending_name: list[str] = []
                for ln, (_t, ws) in enumerate(_lines(colw)):
                    toks = [w["text"] for w in ws]
                    joined = " ".join(toks)

                    if "CREDITS:" in toks or joined.startswith("CREDITS:"):
                        m = re.search(r"CREDITS:\s*(\d+)", joined)
                        if m:
                            sem.credits_printed = int(m.group(1))
                        m = re.search(r"SGPA:\s*([\d.]+)", joined)
                        if m:
                            sem.sgpa_printed = m.group(1)
                        break

                    if toks and toks[0] == "Course" and "Code" in toks[:2]:
                        continue  # column header row

                    course = _parse_course_line(toks, ln)
                    if course:
                        if not course.name and pending_name:
                            course.name = " ".join(pending_name).strip()
                        sem.courses.append(course)
                        pending_name = []
                    else:
                        # wrapped course-name fragment
                        if joined and not re.match(r"^(MAX|OBTAINED|TOTAL|PERCENTAGE)", joined, re.I):
                            pending_name.append(joined)
                        if len(pending_name) > 3:
                            pending_name = pending_name[-3:]

                if sem.courses or sem.credits_printed is not None:
                    tr.semesters[num] = sem

    full_text = "\n".join(full_text_parts)

    # ---- header fields ----
    hdr = _grab_header_fields(full_text)
    tr.student = hdr.get("Name of the Student", "")
    tr.father = hdr.get("Father's Name", "")
    tr.mother = hdr.get("Mother's Name", "")
    tr.reg_no = hdr.get("Registration No.", "") or hdr.get("Roll No.", "")
    tr.category_printed = hdr.get("Category", "")
    tr.programme_printed = hdr.get("Programme", "")
    tr.specialization = hdr.get("Specialization", "")
    tr.year_of_passing = hdr.get("Year of Passing", "")

    # ---- published totals (they sit on page 1 or page 2 depending on layout) ----
    flat = re.sub(r"\s+", " ", full_text)

    def grab(pattern: str) -> str | None:
        m = re.search(pattern, flat, re.I)
        return m.group(1) if m else None

    mm = grab(r"MAX\.?\s*MARKS\s*:?\s*(\d+)")
    om = grab(r"OBTAINED\s*MARKS\s*:?\s*(\d+)")
    pc = grab(r"PERCENTAGE\s*:?\s*([\d.]+)")
    tc = grab(r"TOTAL\s*CREDITS\s*:?\s*(\d+)")
    cg = grab(r"CGPA\s*:?\s*([\d.]+)")

    tr.max_marks_printed = int(mm) if mm else None
    tr.obtained_printed = int(om) if om else None
    tr.percentage_printed = pc
    tr.total_credits_printed = int(tc) if tc else None
    tr.cgpa_printed = cg

    if not tr.semesters:
        stripped = full_text.strip()
        if not stripped:
            tr.parse_errors.append(
                "This PDF contains no selectable text — it is a scanned or flattened image. "
                "Nothing can be read from it without OCR. Re-export the transcript from the "
                "source system as a normal (text) PDF, or run OCR over it first "
                "(e.g. ocrmypdf in.pdf out.pdf), then check it again.")
        elif "SEMESTER" not in stripped.upper():
            tr.parse_errors.append(
                "The word 'SEMESTER' does not appear anywhere in this PDF, so it does not look "
                "like an academic transcript. Check that the right files are in the folder.")
        else:
            tr.parse_errors.append(
                "Semester headings were found but no course rows could be read under them. "
                "The layout differs from the expected one. Run: "
                "python diagnose.py \"<this file>\" and send the output.")
    return tr


# --------------------------------------------------------------------------------------
# VALIDATION
# --------------------------------------------------------------------------------------

def expected_grade(marks: int) -> tuple[str, int]:
    for lo, hi, grade, point in GRADE_SCALE:
        if lo <= marks <= hi:
            return grade, point
    return "?", 0


def grade_point_of(grade: str) -> int | None:
    g = grade.strip().upper()
    if g == ABSENT_GRADE:
        return ABSENT_POINT
    for _lo, _hi, gr, point in GRADE_SCALE:
        if gr.upper() == g:
            return point
    return None


def normalize_category(raw: str) -> tuple[str | None, bool]:
    """Return (key, wording_is_canonical)."""
    raw = (raw or "").strip()
    for key, canonical in CANONICAL_CATEGORIES.items():
        if raw == canonical:
            return key, True
    for key, pattern in CATEGORY_PATTERNS:
        if pattern.search(raw):
            return key, False
    return None, False


def normalize_programme(raw: str) -> tuple[str | None, int | None]:
    for key, sems, pattern in PROGRAMME_PATTERNS:
        if pattern.search(raw or ""):
            return key, sems
    return None, None


@dataclass
class CourseCheck:
    sem: int
    code: str
    name: str
    credit_triple: str
    credit: int
    marks: str
    grade_printed: str
    grade_expected: str
    grade_point: int
    weighted: int
    ok: bool
    note: str


@dataclass
class SemesterCheck:
    sem: int
    n_courses: int
    credits_printed: Any
    credits_computed: int
    credits_ok: bool
    weighted_sum: int
    sgpa_printed: Any
    sgpa_exact: str
    sgpa_rounded: str
    sgpa_ok: bool


@dataclass
class Result:
    file: str
    transcript: Transcript
    issues: list[Issue] = field(default_factory=list)
    course_checks: list[CourseCheck] = field(default_factory=list)
    semester_checks: list[SemesterCheck] = field(default_factory=list)
    totals: dict[str, Any] = field(default_factory=dict)
    category_key: str | None = None
    programme_key: str | None = None
    expected_sems: list[int] = field(default_factory=list)
    found_sems: list[int] = field(default_factory=list)

    @property
    def n_errors(self) -> int:
        return sum(1 for i in self.issues if i.severity == "ERROR")

    @property
    def n_warnings(self) -> int:
        return sum(1 for i in self.issues if i.severity == "WARNING")

    @property
    def status(self) -> str:
        return "FAIL" if self.n_errors else ("PASS (with warnings)" if self.n_warnings else "PASS")


def validate(tr: Transcript, tol: Decimal) -> Result:
    res = Result(file=tr.file, transcript=tr)
    add = res.issues.append

    for pe in tr.parse_errors:
        add(Issue("P001", "ERROR", "File", pe))

    # If nothing was read, every downstream check would just repeat "not found".
    # Report the real reason once and stop, rather than burying it under a pile of
    # misleading totals errors.
    if not tr.semesters:
        return res

    # ---------- 1. Category ----------
    cat_key, canonical = normalize_category(tr.category_printed)
    res.category_key = cat_key
    if cat_key is None:
        add(Issue("C002", "ERROR", "Header",
                  "Category is not recognisable; it must be exactly one of: "
                  + " / ".join(CANONICAL_CATEGORIES.values()),
                  printed=tr.category_printed or "(blank)"))
    elif not canonical:
        add(Issue("C001", "ERROR", "Header",
                  "Category wording is wrong. Expected the exact string "
                  f"'{CANONICAL_CATEGORIES[cat_key]}'.",
                  printed=tr.category_printed,
                  computed=CANONICAL_CATEGORIES[cat_key]))

    # ---------- 2. Programme + semester set ----------
    prog_key, max_sem = normalize_programme(tr.programme_printed)
    res.programme_key = prog_key
    if prog_key is None:
        add(Issue("C003", "ERROR", "Header",
                  "Programme not recognised (expected Bachelor of Vocation or Bachelor of Design)",
                  printed=tr.programme_printed or "(blank)"))

    found = sorted(tr.semesters.keys())
    res.found_sems = found

    if cat_key and max_sem:
        first = FIRST_SEMESTER[cat_key]
        expected = list(range(first, max_sem + 1))
        res.expected_sems = expected
        missing = [s for s in expected if s not in found]
        extra = [s for s in found if s not in expected]
        if missing:
            add(Issue("S010", "ERROR", "Semesters",
                      f"Missing semester(s): {', '.join(map(str, missing))} "
                      f"(category '{CANONICAL_CATEGORIES[cat_key]}' + {prog_key} requires "
                      f"{first}-{max_sem})",
                      printed=", ".join(map(str, found)),
                      computed=", ".join(map(str, expected))))
        if extra:
            add(Issue("S011", "ERROR", "Semesters",
                      f"Semester(s) present that this category should not have: "
                      f"{', '.join(map(str, extra))}",
                      printed=", ".join(map(str, found)),
                      computed=", ".join(map(str, expected))))
        # gap check, independent of the expected range
        gaps = [b for a, b in zip(found, found[1:]) if b - a != 1]
        if gaps:
            add(Issue("S012", "ERROR", "Semesters",
                      "Semesters are not consecutive — there is a gap in the sequence",
                      printed=", ".join(map(str, found))))

    # ---------- 3/4/5. Courses, credits, grades, SGPA ----------
    seen_codes: dict[str, int] = {}
    grand_weighted = 0
    grand_credits = 0
    total_marks = 0
    total_courses = 0
    sum_printed_sem_credits = 0

    for num in found:
        sem = tr.semesters[num]
        loc_sem = f"Semester {num}"
        weighted = 0
        credits_sum = 0

        if not sem.courses:
            add(Issue("S013", "ERROR", loc_sem, "Semester block has no course rows"))

        for c in sem.courses:
            loc = f"{loc_sem} / {c.code or '(no code)'}"
            note_parts: list[str] = []
            ok = True

            if not c.code:
                add(Issue("R001", "ERROR", loc, "Course code is missing on this row"))
                note_parts.append("missing code")
                ok = False
            else:
                if c.code in seen_codes:
                    add(Issue("R002", "ERROR", loc,
                              f"Duplicate course code — already used in semester {seen_codes[c.code]}"))
                    note_parts.append("duplicate code")
                    ok = False
                else:
                    seen_codes[c.code] = num

            marks = c.marks
            if marks is None:
                add(Issue("R003", "ERROR", loc, "Marks could not be read",
                          printed=c.marks_raw))
                note_parts.append("unreadable marks")
                ok = False
                marks = 0
            elif not c.is_absent and not (0 <= marks <= 100):
                add(Issue("R004", "ERROR", loc, "Marks outside 0-100",
                          printed=str(marks)))
                note_parts.append("marks out of range")
                ok = False

            if c.credit <= 0:
                add(Issue("R005", "ERROR", loc,
                          "Course credit (T+P+PR) is zero", printed=c.credit_triple))
                note_parts.append("zero credit")
                ok = False

            if c.is_absent:
                exp_grade, exp_point = ABSENT_GRADE, ABSENT_POINT
            else:
                exp_grade, exp_point = expected_grade(marks)

            printed_point = grade_point_of(c.grade_printed)
            if printed_point is None:
                add(Issue("G002", "ERROR", loc,
                          "Grade letter is not in the grade scale", printed=c.grade_printed or "(blank)"))
                note_parts.append("unknown grade")
                ok = False
            elif c.grade_printed.strip().upper() != exp_grade.upper():
                add(Issue("G001", "ERROR", loc,
                          f"Grade does not match marks ({c.marks_raw}). Scale says '{exp_grade}'.",
                          printed=c.grade_printed, computed=exp_grade))
                note_parts.append("grade mismatch")
                ok = False

            if (not c.is_absent) and marks < PASSING_MARK:
                add(Issue("G003", "WARNING", loc,
                          f"Marks below the passing mark of {PASSING_MARK}", printed=str(marks)))
                note_parts.append("fail")
            if c.is_absent:
                add(Issue("G004", "WARNING", loc, "Student recorded as absent (AB)"))

            # SGPA is computed from the *correct* grade point for the marks,
            # so a wrong printed grade cannot hide a wrong SGPA.
            w = c.credit * exp_point
            weighted += w
            credits_sum += c.credit
            total_marks += marks
            total_courses += 1

            res.course_checks.append(CourseCheck(
                sem=num, code=c.code, name=c.name, credit_triple=c.credit_triple,
                credit=c.credit, marks=c.marks_raw, grade_printed=c.grade_printed,
                grade_expected=exp_grade, grade_point=exp_point, weighted=w,
                ok=ok, note="; ".join(note_parts),
            ))

        # semester credits
        credits_ok = sem.credits_printed == credits_sum
        if sem.credits_printed is None:
            add(Issue("S020", "ERROR", loc_sem, "Printed CREDITS value not found"))
            credits_ok = False
        elif not credits_ok:
            add(Issue("S021", "ERROR", loc_sem,
                      "Printed semester CREDITS does not equal the sum of course credits (T+P+PR)",
                      printed=str(sem.credits_printed), computed=str(credits_sum)))

        # SGPA
        if credits_sum > 0:
            sgpa_exact = dec(weighted) / dec(credits_sum)
        else:
            sgpa_exact = Decimal(0)
        sgpa_round = q(sgpa_exact, SGPA_DP)

        sgpa_ok = False
        if sem.sgpa_printed is None:
            add(Issue("S030", "ERROR", loc_sem, "Printed SGPA not found"))
        else:
            printed_val = dec(sem.sgpa_printed)
            sgpa_ok = abs(printed_val - sgpa_round) <= tol
            if not sgpa_ok:
                add(Issue("S031", "ERROR", loc_sem,
                          f"SGPA is wrong. Sum(credit x grade point) = {weighted}, "
                          f"total credits = {credits_sum}, "
                          f"{weighted}/{credits_sum} = {sgpa_exact:.6f} -> {sgpa_round}",
                          printed=str(sem.sgpa_printed), computed=str(sgpa_round)))

        res.semester_checks.append(SemesterCheck(
            sem=num, n_courses=len(sem.courses), credits_printed=sem.credits_printed,
            credits_computed=credits_sum, credits_ok=credits_ok, weighted_sum=weighted,
            sgpa_printed=sem.sgpa_printed, sgpa_exact=f"{sgpa_exact:.6f}",
            sgpa_rounded=str(sgpa_round), sgpa_ok=sgpa_ok,
        ))

        grand_weighted += weighted
        grand_credits += credits_sum
        if sem.credits_printed:
            sum_printed_sem_credits += sem.credits_printed

    # ---------- 6-10. Grand totals ----------
    max_marks_calc = total_courses * 100
    obtained_calc = total_marks
    pct_exact = (dec(obtained_calc) / dec(max_marks_calc) * 100) if max_marks_calc else Decimal(0)
    pct_round = q(pct_exact, PCT_DP)
    cgpa_exact = (dec(grand_weighted) / dec(grand_credits)) if grand_credits else Decimal(0)
    cgpa_round = q(cgpa_exact, CGPA_DP)

    # cross-check using the Sum(Ci*Si)/Sum(Ci) form printed on page 2
    alt_num = Decimal(0)
    alt_den = Decimal(0)
    for sc in res.semester_checks:
        if sc.sgpa_printed is not None and sc.credits_printed:
            alt_num += dec(sc.credits_printed) * dec(sc.sgpa_printed)
            alt_den += dec(sc.credits_printed)
    cgpa_alt = q(alt_num / alt_den, CGPA_DP) if alt_den else Decimal(0)

    t = tr

    def cmp_int(code: str, label: str, printed, computed, explain: str):
        if printed is None:
            add(Issue(code, "ERROR", "Totals", f"Printed {label} not found",
                      computed=str(computed)))
            return False
        if int(printed) != int(computed):
            add(Issue(code, "ERROR", "Totals",
                      f"{label} is wrong. {explain}",
                      printed=str(printed), computed=str(computed)))
            return False
        return True

    mm_ok = cmp_int("T050", "MAX MARKS", t.max_marks_printed, max_marks_calc,
                    f"{total_courses} course rows x 100 = {max_marks_calc}")
    om_ok = cmp_int("T051", "OBTAINED MARKS", t.obtained_printed, obtained_calc,
                    f"sum of all {total_courses} course marks = {obtained_calc}")
    tc_ok = cmp_int("T053", "TOTAL CREDITS", t.total_credits_printed, grand_credits,
                    f"sum of computed semester credits = {grand_credits}")

    if t.total_credits_printed is not None and sum_printed_sem_credits != grand_credits:
        add(Issue("T055", "WARNING", "Totals",
                  "Sum of the printed semester CREDITS differs from the sum computed from course rows",
                  printed=str(sum_printed_sem_credits), computed=str(grand_credits)))

    pct_ok = False
    if t.percentage_printed is None:
        add(Issue("T052", "ERROR", "Totals", "Printed PERCENTAGE not found",
                  computed=str(pct_round)))
    else:
        pct_ok = abs(dec(t.percentage_printed) - pct_round) <= tol
        if not pct_ok:
            add(Issue("T052", "ERROR", "Totals",
                      f"PERCENTAGE is wrong. {obtained_calc}/{max_marks_calc} x 100 = "
                      f"{pct_exact:.6f} -> {pct_round}",
                      printed=str(t.percentage_printed), computed=str(pct_round)))

    cgpa_ok = False
    if t.cgpa_printed is None:
        add(Issue("T054", "ERROR", "Totals", "Printed CGPA not found", computed=str(cgpa_round)))
    else:
        cgpa_ok = abs(dec(t.cgpa_printed) - cgpa_round) <= tol
        if not cgpa_ok:
            add(Issue("T054", "ERROR", "Totals",
                      f"CGPA is wrong. Sum(credit x grade point) over all semesters = "
                      f"{grand_weighted}, total credits = {grand_credits}, "
                      f"{grand_weighted}/{grand_credits} = {cgpa_exact:.6f} -> {cgpa_round}",
                      printed=str(t.cgpa_printed), computed=str(cgpa_round)))
        elif cgpa_alt and abs(cgpa_alt - cgpa_round) > tol:
            add(Issue("T056", "INFO", "Totals",
                      "CGPA by Sum(Ci x Si)/Sum(Ci) (the page-2 form, using printed SGPAs) "
                      "differs slightly from the course-level computation because of SGPA rounding",
                      printed=str(cgpa_alt), computed=str(cgpa_round)))

    res.totals = {
        "courses_counted": total_courses,
        "max_marks_printed": t.max_marks_printed,
        "max_marks_computed": max_marks_calc,
        "max_marks_ok": mm_ok,
        "obtained_printed": t.obtained_printed,
        "obtained_computed": obtained_calc,
        "obtained_ok": om_ok,
        "percentage_printed": t.percentage_printed,
        "percentage_exact": f"{pct_exact:.6f}",
        "percentage_computed": str(pct_round),
        "percentage_ok": pct_ok,
        "total_credits_printed": t.total_credits_printed,
        "total_credits_computed": grand_credits,
        "total_credits_ok": tc_ok,
        "weighted_points_total": grand_weighted,
        "cgpa_printed": t.cgpa_printed,
        "cgpa_exact": f"{cgpa_exact:.6f}",
        "cgpa_computed": str(cgpa_round),
        "cgpa_ok": cgpa_ok,
        "cgpa_alt_formula": str(cgpa_alt),
    }
    return res


# --------------------------------------------------------------------------------------
# EXCEL REPORT
# --------------------------------------------------------------------------------------

def write_excel(results: list[Result], out_path: str, args) -> None:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    FONT = "Arial"
    HDR_FILL = PatternFill("solid", fgColor="1F3864")
    HDR_FONT = Font(name=FONT, bold=True, color="FFFFFF", size=10)
    BASE = Font(name=FONT, size=10)
    BOLD = Font(name=FONT, size=10, bold=True)
    BAD = PatternFill("solid", fgColor="FFC7CE")
    BAD_F = Font(name=FONT, size=10, color="9C0006")
    GOOD = PatternFill("solid", fgColor="C6EFCE")
    GOOD_F = Font(name=FONT, size=10, color="006100")
    WARN = PatternFill("solid", fgColor="FFEB9C")
    WARN_F = Font(name=FONT, size=10, color="9C6500")
    THIN = Side(style="thin", color="BFBFBF")
    BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

    wb = Workbook()
    wb.remove(wb.active)

    def sheet(name: str, headers: list[str], widths: list[int], freeze: str = "A2"):
        ws = wb.create_sheet(name)
        ws.append(headers)
        for i, h in enumerate(headers, start=1):
            c = ws.cell(row=1, column=i)
            c.fill, c.font = HDR_FILL, HDR_FONT
            c.alignment = Alignment(vertical="center", horizontal="center", wrap_text=True)
            ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
        ws.row_dimensions[1].height = 30
        ws.freeze_panes = freeze
        return ws

    def stamp(ws, first_data_row: int, empty_note: str = ""):
        # An empty sheet is ambiguous — it could mean "nothing to report" or "the tool
        # failed". Say which, in the sheet itself.
        if ws.max_row < first_data_row and empty_note:
            ws.cell(row=first_data_row, column=1, value=empty_note).font = BOLD
            ws.cell(row=first_data_row, column=1).fill = GOOD
        last = ws.max_row
        if last >= first_data_row:
            ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{last}"
        for row in ws.iter_rows(min_row=first_data_row, max_row=last):
            for c in row:
                if c.font is None or c.font.color is None:
                    c.font = BASE
                c.border = BORDER
                c.alignment = Alignment(vertical="top", wrap_text=isinstance(c.value, str))

    def verdict(cell, ok: bool, good="MATCH", bad="MISMATCH"):
        cell.value = good if ok else bad
        cell.fill, cell.font = (GOOD, GOOD_F) if ok else (BAD, BAD_F)
        cell.alignment = Alignment(horizontal="center")

    # ---------------- 1. Summary ----------------
    ws = sheet(
        "1. Summary",
        ["File", "Student", "Registration No.", "Programme", "Category (printed)",
         "Category (canonical)", "Semesters found", "Semesters expected", "Courses",
         "Errors", "Warnings", "Status", "Error codes"],
        [34, 26, 20, 20, 24, 26, 16, 16, 9, 8, 10, 20, 34],
    )
    for r in results:
        codes = sorted({i.code for i in r.issues if i.severity == "ERROR"})
        ws.append([
            r.file, r.transcript.student, r.transcript.reg_no,
            r.programme_key or r.transcript.programme_printed,
            r.transcript.category_printed,
            CANONICAL_CATEGORIES.get(r.category_key or "", "UNRECOGNISED"),
            ", ".join(map(str, r.found_sems)),
            ", ".join(map(str, r.expected_sems)),
            r.totals.get("courses_counted", 0),
            r.n_errors, r.n_warnings, r.status, ", ".join(codes),
        ])
        row = ws.max_row
        c = ws.cell(row=row, column=12)
        if r.n_errors:
            c.fill, c.font = BAD, BAD_F
        elif r.n_warnings:
            c.fill, c.font = WARN, WARN_F
        else:
            c.fill, c.font = GOOD, GOOD_F
        c.alignment = Alignment(horizontal="center")
    stamp(ws, 2, "No transcripts were processed — no readable PDF files were found.")

    # ---------------- 2. Totals ----------------
    ws = sheet(
        "2. Totals Check",
        ["File", "Student", "Courses", "Max Marks (printed)", "Max Marks (computed)",
         "Diff", "Max Marks OK?", "Obtained (printed)", "Obtained (computed)", "Diff",
         "Obtained OK?", "Percentage (printed)", "Percentage (computed)",
         "Percentage (exact)", "Percentage OK?", "Total Credits (printed)",
         "Total Credits (computed)", "Diff", "Credits OK?", "Sum(credit x point)",
         "CGPA (printed)", "CGPA (computed)", "CGPA (exact)", "CGPA OK?",
         "CGPA by Sum(Ci*Si)/Sum(Ci)"],
        [30, 24, 9, 14, 14, 8, 12, 14, 14, 8, 12, 14, 15, 14, 13, 14, 15, 8, 11, 15, 12, 13, 13, 11, 18],
    )
    for r in results:
        t = r.totals
        ws.append([
            r.file, r.transcript.student, t.get("courses_counted"),
            t.get("max_marks_printed"), t.get("max_marks_computed"), None, None,
            t.get("obtained_printed"), t.get("obtained_computed"), None, None,
            _num(t.get("percentage_printed")), _num(t.get("percentage_computed")),
            _num(t.get("percentage_exact")), None,
            t.get("total_credits_printed"), t.get("total_credits_computed"), None, None,
            t.get("weighted_points_total"),
            _num(t.get("cgpa_printed")), _num(t.get("cgpa_computed")),
            _num(t.get("cgpa_exact")), None, _num(t.get("cgpa_alt_formula")),
        ])
        row = ws.max_row
        # live difference formulas so the comparison is visible in the sheet itself
        ws.cell(row=row, column=6).value = f"=IFERROR(D{row}-E{row},\"\")"
        ws.cell(row=row, column=10).value = f"=IFERROR(H{row}-I{row},\"\")"
        ws.cell(row=row, column=18).value = f"=IFERROR(P{row}-Q{row},\"\")"
        verdict(ws.cell(row=row, column=7), bool(t.get("max_marks_ok")))
        verdict(ws.cell(row=row, column=11), bool(t.get("obtained_ok")))
        verdict(ws.cell(row=row, column=15), bool(t.get("percentage_ok")))
        verdict(ws.cell(row=row, column=19), bool(t.get("total_credits_ok")))
        verdict(ws.cell(row=row, column=24), bool(t.get("cgpa_ok")))
        for col in (12, 13, 14, 21, 22, 23, 25):
            ws.cell(row=row, column=col).number_format = "0.000000" if col in (14, 23) else "0.0"
    stamp(ws, 2, "No totals could be computed — see sheet '6. Errors & Warnings'.")

    # ---------------- 3. Semester checks ----------------
    ws = sheet(
        "3. Semester Check",
        ["File", "Student", "Sem", "Semester name", "Courses", "Credits (printed)",
         "Credits (computed)", "Diff", "Credits OK?", "Sum(credit x grade point)",
         "SGPA (printed)", "SGPA (computed)", "SGPA (exact)", "Diff", "SGPA OK?"],
        [30, 24, 6, 14, 9, 13, 14, 8, 11, 17, 13, 14, 14, 9, 11],
    )
    for r in results:
        for sc in r.semester_checks:
            ws.append([
                r.file, r.transcript.student, sc.sem, SEM_NAME.get(sc.sem, ""), sc.n_courses,
                sc.credits_printed, sc.credits_computed, None, None, sc.weighted_sum,
                _num(sc.sgpa_printed), _num(sc.sgpa_rounded), _num(sc.sgpa_exact), None, None,
            ])
            row = ws.max_row
            ws.cell(row=row, column=8).value = f"=IFERROR(F{row}-G{row},\"\")"
            ws.cell(row=row, column=14).value = f"=IFERROR(ROUND(K{row}-L{row},4),\"\")"
            verdict(ws.cell(row=row, column=9), sc.credits_ok)
            verdict(ws.cell(row=row, column=15), sc.sgpa_ok)
            for col in (11, 12, 14):
                ws.cell(row=row, column=col).number_format = "0.0"
            ws.cell(row=row, column=13).number_format = "0.000000"
    stamp(ws, 2, "No semester data was read from any PDF — see sheet '6. Errors & Warnings'.")

    # ---------------- 4. Course checks ----------------
    ws = sheet(
        "4. Course Check",
        ["File", "Student", "Sem", "Course Code", "Course Name", "Credits (T-P-PR)",
         "Credit total", "Marks", "Grade (printed)", "Grade (expected)", "Grade point",
         "Credit x point", "Row OK?", "Note"],
        [30, 22, 6, 13, 40, 14, 11, 8, 13, 14, 11, 13, 10, 26],
    )
    for r in results:
        for cc in r.course_checks:
            ws.append([
                r.file, r.transcript.student, cc.sem, cc.code, cc.name, cc.credit_triple,
                cc.credit, cc.marks, cc.grade_printed, cc.grade_expected, cc.grade_point,
                cc.weighted, None, cc.note,
            ])
            row = ws.max_row
            verdict(ws.cell(row=row, column=13), cc.ok, good="OK", bad="ERROR")
            if not cc.ok:
                for col in (9, 10):
                    ws.cell(row=row, column=col).fill = BAD
    stamp(ws, 2, "No course rows were read from any PDF — see sheet '6. Errors & Warnings'.")

    # ---------------- 5. Category & sequence ----------------
    ws = sheet(
        "5. Category & Sequence",
        ["File", "Student", "Category (printed)", "Wording OK?", "Category (canonical)",
         "Programme (printed)", "Programme", "Max semesters", "Expected semesters",
         "Semesters found", "Missing", "Unexpected", "Sequence OK?"],
        [30, 24, 26, 12, 26, 22, 11, 13, 20, 20, 16, 16, 13],
    )
    for r in results:
        _key, max_sem = normalize_programme(r.transcript.programme_printed)
        exp = r.expected_sems
        found = r.found_sems
        missing = [s for s in exp if s not in found]
        extra = [s for s in found if s not in exp]
        gap_ok = all(b - a == 1 for a, b in zip(found, found[1:]))
        wording_ok = (r.category_key is not None
                      and r.transcript.category_printed.strip()
                      == CANONICAL_CATEGORIES.get(r.category_key, ""))
        ws.append([
            r.file, r.transcript.student, r.transcript.category_printed, None,
            CANONICAL_CATEGORIES.get(r.category_key or "", "UNRECOGNISED"),
            r.transcript.programme_printed, r.programme_key or "?", max_sem,
            ", ".join(map(str, exp)), ", ".join(map(str, found)),
            ", ".join(map(str, missing)) or "-", ", ".join(map(str, extra)) or "-", None,
        ])
        row = ws.max_row
        verdict(ws.cell(row=row, column=4), wording_ok, good="OK", bad="WRONG")
        verdict(ws.cell(row=row, column=13), gap_ok and not missing and not extra,
                good="OK", bad="ERROR")
    stamp(ws, 2, "No transcripts were processed.")

    # ---------------- 6. All issues ----------------
    ws = sheet(
        "6. Errors & Warnings",
        ["File", "Student", "Severity", "Code", "Location", "Problem",
         "Printed on transcript", "Correct / computed"],
        [30, 22, 10, 8, 26, 62, 20, 20],
    )
    for r in results:
        for i in r.issues:
            ws.append([r.file, r.transcript.student, i.severity, i.code, i.location,
                       i.message, i.printed, i.computed])
            row = ws.max_row
            c = ws.cell(row=row, column=3)
            if i.severity == "ERROR":
                c.fill, c.font = BAD, BAD_F
            elif i.severity == "WARNING":
                c.fill, c.font = WARN, WARN_F
            c.alignment = Alignment(horizontal="center")
    stamp(ws, 2, "No problems found. Every transcript checked out against all the rules.")

    # ---------------- 7. Grade scale ----------------
    ws = sheet("7. Grade Scale", ["Marks from", "Marks to", "Grade", "Grade Point", "Description"],
               [12, 12, 10, 12, 20])
    desc = {"O": "Outstanding", "A+": "Excellent", "A": "Very Good", "B+": "Good",
            "B": "Above Average", "C": "Average", "P": "Pass", "F": "Fail"}
    for lo, hi, g, p in GRADE_SCALE:
        ws.append([lo, hi, g, p, desc.get(g, "")])
    ws.append([None, None, ABSENT_GRADE, ABSENT_POINT, "Absent"])
    stamp(ws, 2)
    ws.cell(row=ws.max_row + 2, column=1, value="Passing mark").font = BOLD
    ws.cell(row=ws.max_row, column=2, value=PASSING_MARK).font = BASE
    ws.cell(row=ws.max_row + 1, column=1,
            value="Source: 'Details of Grade and Grade Point Average' table printed on page 2 "
                  "of the transcript. All subjects carry 100 marks.").font = BASE

    # ---------------- 8. Run info ----------------
    ws = sheet("8. Run Info", ["Item", "Value"], [40, 80])
    counts = {
        "PASS": sum(1 for r in results if r.status == "PASS"),
        "PASS (with warnings)": sum(1 for r in results if r.status.startswith("PASS (")),
        "FAIL": sum(1 for r in results if r.status == "FAIL"),
    }
    info = [
        ("Tool", f"transcript_audit.py v{VERSION}"),
        ("Run at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Transcripts processed", len(results)),
        ("Clean (PASS)", counts["PASS"]),
        ("PASS with warnings", counts["PASS (with warnings)"]),
        ("FAIL (one or more errors)", counts["FAIL"]),
        ("Total errors", sum(r.n_errors for r in results)),
        ("Total warnings", sum(r.n_warnings for r in results)),
        ("Comparison tolerance", str(args.tol)),
        ("Rounding", "half-up to 1 decimal place for SGPA, CGPA and percentage"),
        ("Arithmetic", "decimal.Decimal (exact) — no floating point"),
        ("SGPA formula", "Sum(course credit x grade point) / Sum(course credits)"),
        ("CGPA formula", "Sum over all courses(credit x grade point) / total credits"),
        ("Max marks formula", "number of course rows x 100"),
        ("Percentage formula", "obtained / max x 100"),
        ("Grade points source", "grade scale on page 2 of the transcript"),
        ("Accepted categories", " | ".join(CANONICAL_CATEGORIES.values())),
        ("BVoc semesters", "1-6 (Regular), 3-6 (Lateral 2nd year), 5-6 (Lateral 3rd year)"),
        ("BDes semesters", "1-8 (Regular), 3-8 (Lateral 2nd year), 5-8 (Lateral 3rd year)"),
        ("Note", "Grade points used in SGPA/CGPA come from the marks via the grade scale, "
                 "so a wrong printed grade cannot mask a wrong SGPA."),
    ]
    for k, v in info:
        ws.append([k, v])
    stamp(ws, 2)

    wb.save(out_path)
    return {ws.title: max(0, ws.max_row - 1) for ws in wb.worksheets}


def _num(v):
    """Return a Decimal-backed float for Excel, or the original value if not numeric."""
    if v is None or v == "":
        return None
    try:
        return float(Decimal(str(v)))
    except Exception:
        return v


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------

def collect_pdfs(inputs: list[str]) -> list[str]:
    files: list[str] = []
    for item in inputs:
        p = Path(item)
        if p.is_dir():
            files.extend(sorted(str(f) for f in p.rglob("*.pdf")))
        elif p.is_file() and p.suffix.lower() == ".pdf":
            files.append(str(p))
    seen, out = set(), []
    for f in files:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out


def process_one(args_tuple) -> Result:
    path, tol = args_tuple
    try:
        tr = parse_pdf(path)
        return validate(tr, tol)
    except Exception as exc:  # a broken PDF must not kill a 500-file run
        tr = Transcript(file=os.path.basename(path))
        res = Result(file=tr.file, transcript=tr)
        res.issues.append(Issue("P000", "ERROR", "File",
                                f"Could not process this PDF: {exc}",
                                computed=traceback.format_exc(limit=1).strip()))
        return res


def _clean_path(raw: str) -> str:
    """Tidy a pasted or drag-and-dropped path: strip quotes, trailing spaces, ~ and escapes."""
    s = raw.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        s = s[1:-1]
    s = s.replace("\\ ", " ").strip()
    return os.path.expanduser(os.path.expandvars(s))


def ask_input_path() -> list[str]:
    """Ask for the folder (or single PDF) until something with PDFs in it is given."""
    print("\nStep 1 of 2 — where are the transcript PDFs?")
    print("  Paste a folder path, or a single .pdf path. You can also drag the folder")
    print("  into this window. Press Enter on its own to use the current folder.")
    while True:
        raw = input("\n  PDF folder: ").strip()
        path = _clean_path(raw) if raw else os.getcwd()

        if not os.path.exists(path):
            print(f"  -> Nothing found at: {path}")
            print("     Check the path and try again (Ctrl+C to quit).")
            continue

        files = collect_pdfs([path])
        if not files:
            print(f"  -> No PDF files found in: {path}")
            if os.path.isdir(path):
                print("     The tool searches sub-folders too, so this folder looks empty of PDFs.")
            continue

        print(f"  -> Found {len(files)} PDF file(s).")
        if len(files) > 500:
            print(f"     Note: that is more than the expected batch of 500.")
        return [path]


def ask_output_path(default_dir: str, pdf_dir: str | None = None) -> str:
    """Ask where to save the Excel report; accepts a folder, a filename, or a full path."""
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    default = os.path.join(default_dir, f"transcript_audit_{stamp}.xlsx")
    print("\nStep 2 of 2 — which folder should the Excel report be saved in?")
    print("  This should usually be a DIFFERENT folder from the PDFs, so the report")
    print("  doesn't end up mixed in with the transcripts.")
    print("  Give a full path, a folder, or just a file name.")
    print(f"  Press Enter to accept: {default}")
    pdf_dir_norm = os.path.normcase(os.path.abspath(pdf_dir)) if pdf_dir else None
    while True:
        raw = input("\n  Save report as: ").strip()
        out = _clean_path(raw) if raw else default

        # a folder was given -> put the default file name inside it
        if os.path.isdir(out):
            out = os.path.join(out, f"transcript_audit_{stamp}.xlsx")
        # a bare file name -> put it in the default save folder, not the PDF folder
        elif not os.path.isabs(out) and os.path.dirname(out) == "":
            out = os.path.join(default_dir, out)

        if not out.lower().endswith(".xlsx"):
            out += ".xlsx"

        out_dir_norm = os.path.normcase(os.path.dirname(os.path.abspath(out)))
        if pdf_dir_norm and out_dir_norm == pdf_dir_norm:
            print(f"  -> That's the same folder as the PDFs ({pdf_dir}).")
            if input("     Save there anyway? [y/N]: ").strip().lower() not in {"y", "yes"}:
                continue

        parent = os.path.dirname(os.path.abspath(out))
        if not os.path.isdir(parent):
            try:
                os.makedirs(parent, exist_ok=True)
                print(f"  -> Created folder: {parent}")
            except OSError as exc:
                print(f"  -> Cannot create folder {parent}: {exc}")
                continue

        if os.path.exists(out):
            if input(f"  -> {os.path.basename(out)} already exists. Overwrite? [y/N]: "
                     ).strip().lower() not in {"y", "yes"}:
                continue

        # fail early rather than after all the parsing work
        try:
            with open(out, "ab"):
                pass
            if os.path.getsize(out) == 0:
                os.remove(out)
        except OSError as exc:
            print(f"  -> Cannot write there: {exc}")
            print("     If the file is open in Excel, close it or choose another name.")
            continue

        return out


def run_interactive(args) -> None:
    """Fill args.inputs and args.out by asking the user."""
    print("=" * 72)
    print(f"  Transcript Audit Tool v{VERSION}")
    print("  Checks category, semester sequence, grades, credits, SGPA, CGPA,")
    print("  max marks, obtained marks and percentage against the printed values.")
    print("=" * 72)
    args.inputs = ask_input_path()
    base = args.inputs[0]
    pdf_dir = base if os.path.isdir(base) else os.path.dirname(os.path.abspath(base))
    # Default the report to a "Reports" folder next to the PDFs, not inside them,
    # so the two never get mixed together.
    default_dir = os.path.join(os.path.dirname(os.path.abspath(pdf_dir.rstrip(os.sep))) or pdf_dir,
                               "Transcript_Audit_Reports")
    args.out = ask_output_path(default_dir, pdf_dir=pdf_dir)
    print("\n" + "-" * 72)
    print(f"  Reading from : {args.inputs[0]}")
    print(f"  Saving to    : {args.out}")
    print("-" * 72 + "\n")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Verify Medhavi Skills University transcripts and write an Excel audit report. "
                    "Run with no arguments to be prompted for the folder and the save location.")
    ap.add_argument("inputs", nargs="*", help="PDF files and/or folders containing PDFs "
                                              "(omit to be asked interactively)")
    ap.add_argument("-o", "--out", default=None, help="output .xlsx path")
    ap.add_argument("--tol", type=Decimal, default=Decimal("0.0"),
                    help="tolerance for SGPA/CGPA/percentage comparison (default 0.0 = exact)")
    ap.add_argument("--workers", type=int, default=1, help="parallel worker processes")
    ap.add_argument("--json", dest="json_out", default=None, help="also dump raw results to JSON")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    interactive = not args.inputs
    if interactive:
        if not sys.stdin.isatty():
            ap.error("no input given (and there is no terminal to ask on). "
                     "Pass a folder or PDF path, e.g. transcript_audit.py ./transcripts")
        try:
            run_interactive(args)
        except (KeyboardInterrupt, EOFError):
            print("\nCancelled.")
            return 130
    elif args.out is None:
        args.out = "transcript_audit_report.xlsx"

    files = collect_pdfs(args.inputs)
    if not files:
        print("No PDF files found.", file=sys.stderr)
        return 2
    if len(files) > 500 and not args.quiet:
        print(f"Note: {len(files)} files — more than the expected batch of 500.", file=sys.stderr)

    results: list[Result] = []
    payload = [(f, args.tol) for f in files]

    if args.workers > 1:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(max_workers=args.workers) as ex:
            for n, res in enumerate(ex.map(process_one, payload), 1):
                results.append(res)
                if not args.quiet:
                    print(f"[{n}/{len(files)}] {res.file}: {res.status}")
    else:
        for n, item in enumerate(payload, 1):
            res = process_one(item)
            results.append(res)
            if not args.quiet:
                print(f"[{n}/{len(files)}] {res.file}: {res.status}")

    sheet_rows: dict[str, int] = {}
    while True:
        try:
            sheet_rows = write_excel(results, args.out, args) or {}
            break
        except OSError as exc:
            print(f"\nCould not save the report to {args.out}: {exc}", file=sys.stderr)
            if not interactive:
                return 3
            print("If the file is open in Excel, close it and choose a location again.")
            args.out = ask_output_path(os.path.dirname(os.path.abspath(args.out)))

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(
                [{"file": r.file, "status": r.status, "student": r.transcript.student,
                  "reg_no": r.transcript.reg_no, "totals": r.totals,
                  "issues": [asdict(i) for i in r.issues],
                  "semesters": [asdict(s) for s in r.semester_checks],
                  "courses": [asdict(c) for c in r.course_checks]} for r in results],
                fh, indent=2, default=str)

    errs = sum(r.n_errors for r in results)
    warns = sum(r.n_warnings for r in results)
    failed = [r for r in results if r.n_errors]

    if not args.quiet:
        print("\n" + "=" * 72)
        print(f"  Transcripts checked : {len(results)}")
        print(f"  Clean               : {len(results) - len(failed)}")
        print(f"  With errors         : {len(failed)}")
        print(f"  Total errors        : {errs}   (warnings: {warns})")
        print(f"  Report saved to     : {os.path.abspath(args.out)}")
        print("=" * 72)
        print("  Rows written to each sheet:")
        for name, n in sheet_rows.items():
            print(f"    {name:<26} {n}")

        unreadable = [r for r in results
                      if any(i.code in {"P000", "P001"} for i in r.issues)]
        if unreadable:
            print(f"\n  {len(unreadable)} file(s) could not be read at all. Reason for the first:")
            first = next(i for i in unreadable[0].issues if i.code in {"P000", "P001"})
            print(f"    {unreadable[0].file}")
            for chunk in re.findall(r".{1,66}(?:\s|$)", first.message):
                print(f"    {chunk.strip()}")
        if failed:
            print("\n  Transcripts needing attention:")
            for r in failed[:20]:
                name = r.transcript.student or r.file
                print(f"    - {name}: {r.n_errors} error(s) "
                      f"[{', '.join(sorted({i.code for i in r.issues if i.severity == 'ERROR'}))}]")
            if len(failed) > 20:
                print(f"    ... and {len(failed) - 20} more — see the report.")
            print("\n  Open sheet '6. Errors & Warnings' for the printed value next to the "
                  "correct one.")

    if interactive and sys.stdin.isatty():
        try:
            input("\nPress Enter to close.")
        except (EOFError, KeyboardInterrupt):
            pass
    return 1 if errs else 0


if __name__ == "__main__":
    raise SystemExit(main())
