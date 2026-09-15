/* =========================================================================
   MIRAGE COMPANION WIDGET
   Drop-in replacement for mirage-chat-widget.js

   Same offline engine (knowledge base, typo tolerance, memory, intents,
   follow-ups, voice in/out) with the animated companion as the face of it.
   Renders inside a shadow root, so nothing collides with your page styles
   and nothing leaks out.

   INSTALL
     <script src="mirage-companion-widget.js" defer></script>

   OPTIONAL API
     MirageCompanion.open()
     MirageCompanion.close()
     MirageCompanion.toggle()
     MirageCompanion.ask("What tools are available?")
     MirageCompanion.forget()   // clears the remembered name
   ========================================================================= */

(function () {

  'use strict';

  if (window.__mirageCompanionLoaded) {
    return;
  }

  window.__mirageCompanionLoaded = true;

  var CFG = {

    botName: "Mirage",

    subtitle: "Verification Suite Assistant",

    version: "4.1",

    portalUrl: "portal.html",

    tool1Url: "https://msu581.github.io/AllinONE/",

    tool2Url: "https://msu581.github.io/white-Vs-Original/",

    storageKey: "mirage_ai_memory_v3",

    maxHistory: 12

  };

  var WIDGET_CSS = ":root{font-family:system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:#27392f;background:#f5f5ef;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid #91b884;outline-offset:4px}header{height:88px;max-width:1200px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:0 32px}.brand{font-size:25px;font-weight:800;letter-spacing:-1px;display:flex;gap:10px;align-items:center}.logo{background:#345943;color:#fff;border-radius:12px;padding:5px 10px;font-size:22px}.status{font-size:12px;display:flex;align-items:center;gap:8px}.dot{width:7px;height:7px;background:#74a264;border-radius:50%}.status span:last-child{color:#788176}main{max-width:1200px;margin:0 auto;padding:40px 32px 24px}.eyebrow{font-size:11px;letter-spacing:2px;font-weight:700;color:#778775}.intro h1{font-size:clamp(32px,4vw,48px);font-weight:550;letter-spacing:-2px;margin:13px 0}.intro p{color:#7a8177;font-size:15px;line-height:1.7;margin:0}.layout{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:34px}.stage{position:relative;min-height:480px;background:#e9eddf;border:1px solid #dfe5d5;border-radius:24px;overflow:hidden;display:flex;align-items:center;flex-direction:column}.stage-top{align-self:stretch;padding:24px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#6c7d64;letter-spacing:1.2px}.pill{border:1px solid #cdd7c4;padding:6px 10px;border-radius:20px;letter-spacing:0;font-size:11px}.speech{margin-top:14px;background:#fffef8;border:1px solid #e0e4d8;box-shadow:0 5px 15px #34442a06;border-radius:14px;padding:13px 20px;font-size:14px;position:relative;max-width:88%;text-align:center;min-height:47px}.speech:after{content:\"\";position:absolute;bottom:-7px;left:calc(50% - 6px);width:12px;height:12px;background:#fffef8;transform:rotate(45deg);border-bottom:1px solid #e0e4d8;border-right:1px solid #e0e4d8}.world{position:relative;width:100%;height:252px;display:grid;place-items:center}.orbit{position:absolute;width:330px;height:180px;border:1px solid #d9e0ce;border-radius:50%;transform:rotate(-13deg);top:70px}.spark{position:absolute;color:#94a786;font-size:25px;left:20%;top:50px}.spark.two{left:auto;right:18%;top:150px;font-size:16px}.robot{width:180px;height:164px;position:relative;z-index:1;animation:float 3.5s ease-in-out infinite;transition:transform .3s}.antenna{position:absolute;width:5px;height:23px;background:#597247;left:88px;top:-20px;border-radius:3px}.antenna:before{content:\"\";width:13px;height:13px;position:absolute;top:-6px;left:-4px;background:#a4ba80;border:3px solid #597247;border-radius:50%}.head{position:absolute;inset:0 0 30px;background:#c2d49e;border:2px solid #a7be84;border-radius:48px;box-shadow:inset 0 7px 0 #d5e2bb,0 10px 0 #aec58c;transition:transform .15s}.face{position:absolute;inset:25px 18px 24px;background:#2d4539;border-radius:29px;box-shadow:inset 0 4px 6px #172c2866;overflow:hidden}.eyes{position:absolute;inset:0;display:flex;justify-content:center;gap:33px;align-items:center;transform:translate(var(--look-x,0px),var(--look-y,0px));transition:transform .12s}.eye{width:12px;height:23px;background:#e3efb6;border-radius:9px;animation:blink 5s infinite}.mouth{position:absolute;left:calc(50% - 8px);bottom:13px;width:16px;height:8px;border-bottom:3px solid #b0cc9d;border-radius:0 0 12px 12px}.cheek{position:absolute;width:13px;height:5px;border-radius:5px;background:#799571;bottom:20px;left:15px}.cheek.right{left:auto;right:15px}.foot{position:absolute;bottom:9px;width:40px;height:21px;background:#90a96c;border-radius:7px 7px 12px 12px;left:31px}.foot.right{left:auto;right:31px}.arm{position:absolute;top:60px;left:-16px;width:17px;height:40px;background:#abc18a;border:2px solid #9ab47c;border-radius:13px;transform:rotate(12deg)}.arm.right{left:auto;right:-16px;transform:rotate(-12deg);transform-origin:top}.shadow{position:absolute;width:130px;height:18px;border-radius:50%;background:#6f815528;bottom:20px;filter:blur(3px)}.robot.wave .arm.right{animation:wave .35s ease-in-out 6}.robot.dance{animation:dance .4s ease-in-out 6}.robot.sleep .eye{height:3px;animation:none}.robot.sleep .head{transform:rotate(8deg)}.robot.open .head{transform:translateY(-28px) rotate(-8deg)}.robot.open .mouth{height:15px;border:2px solid #b0cc9d;border-radius:50%;bottom:8px}.caption{color:#6e7c64;font-size:12px;margin:0 0 24px}.stage-actions{display:flex;gap:8px;padding-bottom:24px}.small-btn{border:1px solid #cbd5bf;color:#52674b;background:#f4f6eb;border-radius:9px;padding:8px 14px;font-size:12px}.small-btn:hover{background:white}.chat{min-height:480px;border:1px solid #e0e3d9;background:#fffefa;border-radius:24px;display:flex;flex-direction:column;overflow:hidden}.chat-head{padding:21px 24px;border-bottom:1px solid #eeeee6;display:flex;justify-content:space-between;align-items:center}.chat-title{font-size:15px;font-weight:650}.chat-sub{font-size:11px;color:#909587;margin-top:5px}.clear{border:0;background:transparent;color:#85917f;font-size:12px;padding:8px}.messages{height:254px;overflow:auto;padding:22px 24px;scroll-behavior:smooth}.message{margin:0 0 17px;display:flex;gap:9px;align-items:flex-start}.avatar{flex-shrink:0;background:#e4edda;color:#58704b;border-radius:9px;width:27px;height:27px;display:grid;place-items:center;font-size:11px;font-weight:bold}.bubble{font-size:13px;line-height:1.65;max-width:85%;background:#f0f2e9;border-radius:0 13px 13px 13px;padding:11px 14px;white-space:pre-wrap;overflow-wrap:anywhere}.message.user{justify-content:flex-end}.user .bubble{background:#355843;color:white;border-radius:13px 0 13px 13px}.suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 24px 17px}.suggestion{border:1px solid #e0e5d7;color:#64775b;background:transparent;border-radius:20px;padding:6px 11px;font-size:11px}.suggestion:hover{background:#edf2e5}form{margin:0 20px 12px;display:flex;gap:8px;align-items:center;border:1px solid #dfe4d5;background:white;border-radius:13px;padding:6px 7px 6px 14px}input{min-width:0;flex:1;border:0;background:transparent;padding:9px 0;color:#344635;font-size:13px}input:focus{outline:none}form:focus-within{border-color:#7d9a6d;box-shadow:0 0 0 2px #c9d9be55}.send{border:0;border-radius:9px;width:37px;height:37px;background:#355843;color:#fff;font-size:21px}.input-note{text-align:center;color:#959a8c;font-size:10px;margin:0 10px 16px}.features{display:flex;gap:27px;color:#7a8472;font-size:11px;margin-top:23px;flex-wrap:wrap}.features span:before{content:\"\u2713\";margin-right:7px;color:#668754}footer{margin-top:35px;border-top:1px solid #e1e4d8;padding:19px 0;display:flex;justify-content:space-between;font-size:11px;color:#8e9587}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@keyframes float{50%{transform:translateY(-9px)}}@keyframes blink{0%,43%,47%,100%{scale:1 1}45%{scale:1 .12}}@keyframes wave{50%{transform:rotate(-125deg)}}@keyframes dance{0%,100%{transform:rotate(-12deg) translateX(-9px)}50%{transform:rotate(12deg) translateX(9px)}}@media(max-width:750px){header{height:70px;padding:0 20px}main{padding:24px 20px}.layout{grid-template-columns:1fr}.stage{min-height:420px}.intro h1{letter-spacing:-1.5px}.status span:last-child{display:none}footer{gap:16px}.features{gap:14px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}\n:root{--accent:#365f4b;--soft:#e6eddc;--shell:#c4d99f;--rim:#97b576;--shine:#e2edca;--visor:#2d493e;--light:#e8f4bd;--limb:#acc587}.logo,.send,.user .bubble{background:var(--accent)}.brand{font-size:22px}.avatar{background:var(--soft);color:var(--accent)}.picker{display:flex;gap:10px;margin:26px 0 0}.companion-choice{display:flex;gap:12px;align-items:center;text-align:left;background:transparent;border:1px solid #dfe5d7;border-radius:13px;padding:12px 18px;min-width:170px;color:#344c3c}.companion-choice:hover{background:white}.companion-choice[aria-pressed=true]{background:#fffefa;border-color:var(--accent);box-shadow:0 3px 9px #283b2808}.mini-face{width:35px;height:32px;display:flex;justify-content:center;align-items:center;gap:7px;border:5px solid #c4d99f;background:#2d493e;border-radius:11px}.mini-face:before,.mini-face:after{content:\"\";width:3px;height:7px;background:#eaf3d9;border-radius:3px}.mini-face.nova{border-color:#cbc2ec;background:#443a61;border-radius:50%}.mini-face.pip{border-color:#edc29c;background:#644b39;border-radius:8px}.companion-choice strong{display:block;font-size:13px}.companion-choice small{display:block;color:#778570;font-size:10px;margin-top:3px}.layout{margin-top:22px;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}.header-tools{display:flex;align-items:center;gap:20px}.settings-button{border:1px solid #d9e1d2;background:#fffefa;color:#52664b;border-radius:9px;padding:9px 13px;font-size:12px}.stage{isolation:isolate;background:linear-gradient(#eaf0e2,#dfe9d3);min-height:495px}.landscape{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}.sun{position:absolute;right:12%;top:114px;width:60px;height:60px;border-radius:50%;background:#f9f8dd;box-shadow:0 0 0 18px #f7f7d938,0 0 0 37px #f7f7d91c}.hill{position:absolute;bottom:-70px;left:-90px;width:90%;height:220px;background:#c4d6b4;border-radius:50% 70% 0 0;transform:rotate(9deg)}.hill.back{bottom:-23px;left:43%;width:90%;height:225px;background:#d1e1c1;transform:rotate(-13deg)}.plant{position:absolute;bottom:90px;left:11%;width:3px;height:38px;background:#91ac7d;transform:rotate(-8deg)}.plant:before,.plant:after{content:\"\";position:absolute;width:17px;height:9px;background:#9bb98a;border-radius:0 90%;left:-16px;top:10px;transform:rotate(20deg)}.plant:after{left:2px;top:2px;transform:rotate(-30deg)}.cloud{position:absolute;left:13%;top:170px;width:78px;height:20px;background:#f5f8ee99;border-radius:50px;animation:cloud-drift 20s ease-in-out infinite alternate}.cloud:before{content:\"\";position:absolute;width:34px;height:30px;left:16px;bottom:0;border-radius:50%;background:inherit}.stars{display:none}.stage[data-scene=night]{background:linear-gradient(165deg,#28364d,#48566c)}.stage[data-scene=night] .sun{background:#efead3;box-shadow:0 0 35px #ece5c126}.stage[data-scene=night] .hill{background:#33465b}.stage[data-scene=night] .hill.back{background:#3e5365}.stage[data-scene=night] .cloud{display:none}.stage[data-scene=night] .stars{display:block;position:absolute;inset:0;background-image:radial-gradient(circle at 12% 24%,#e7ead5 1px,transparent 2px),radial-gradient(circle at 37% 18%,#e7ead5 1px,transparent 2px),radial-gradient(circle at 60% 35%,#e7ead5 1px,transparent 2px),radial-gradient(circle at 86% 49%,#e7ead5 1px,transparent 2px)}.stage[data-scene=night] .stage-top,.stage[data-scene=night] .caption{color:#e0e6d6}.stage[data-scene=night] .pill{border-color:#ffffff30}.stage[data-scene=studio]{background:linear-gradient(145deg,#f2eae0,#e6e0d9)}.stage[data-scene=studio] .sun{border-radius:10px;right:9%;top:150px;width:110px;height:100px;background:linear-gradient(90deg,transparent 48%,#d0c6b8 48%,#d0c6b8 52%,transparent 52%),linear-gradient(0deg,#e6eedf 48%,#d0c6b8 48%,#d0c6b8 52%,#e6eedf 52%);border:7px solid #d0c6b8;box-shadow:none}.stage[data-scene=studio] .hill{bottom:0;left:0;width:100%;height:125px;border-radius:0;background:#d4c6b5;border-top:5px solid #c6b49c;transform:none}.stage[data-scene=studio] .hill.back,.stage[data-scene=studio] .cloud{display:none}.stage[data-scene=studio] .plant{bottom:125px}.stage-top{z-index:3}.speech{z-index:3;max-width:88%;font-size:12px;margin-top:6px;min-height:45px}.world{height:250px;flex-shrink:0}.orbit,.spark{display:none}.actor{position:absolute;width:180px;height:164px;left:calc(50% - 90px);top:50px;transition:transform 1.7s ease-in-out,opacity .6s}.actor.leaving,.actor.away{transform:translateX(600px);opacity:0}.actor.leaving .foot{animation:step .3s infinite alternate}.actor.leaving .foot.right{animation-delay:.15s}.head{background:var(--shell);border-color:var(--rim);box-shadow:inset 0 7px 0 var(--shine),0 10px 0 var(--limb)}.face{background:var(--visor)}.eye{background:var(--light)}.foot{background:var(--rim)}.arm{background:var(--limb);border-color:var(--rim)}.antenna{background:var(--rim)}.antenna:before{background:var(--shell);border-color:var(--rim)}.mouth{border-color:var(--light)}.cheek{background:var(--shell);opacity:.45}.ear{display:none;position:absolute;top:-16px;width:42px;height:45px;background:var(--shell);border:2px solid var(--rim);border-radius:8px 35px 0 0;left:9px;transform:rotate(-14deg)}.ear.right{left:auto;right:9px;transform:scaleX(-1) rotate(-14deg)}[data-companion=pip] .ear{display:block}[data-companion=pip] .antenna{display:none}[data-companion=pip] .head{border-radius:38px}[data-companion=nova] .head{border-radius:65px}[data-companion=nova] .antenna:before{border-radius:2px;transform:rotate(45deg)}[data-companion=nova] .face{border-radius:40px}[data-companion=nova] .eye{height:19px;width:16px;border-radius:50%}.robot.stretch .arm{transform:rotate(155deg)}.robot.stretch .arm.right{transform:rotate(-155deg)}.robot.stretch{transform:translateY(-12px);animation:none}.robot.look .head{animation:look-around 3s ease-in-out}.robot.sleep{animation:breathe 4s ease-in-out infinite}.robot.sleep .mouth{width:8px;left:calc(50% - 4px);height:8px;border:2px solid var(--light);border-radius:50%}.robot.sleep.open .head{transform:translateY(-12px) rotate(7deg)}.zzz{position:absolute;left:155px;top:-18px;display:none;color:var(--accent);font-weight:750;pointer-events:none}.sleep .zzz{display:block}.zzz span{position:absolute;animation:snore 3s linear infinite;font-size:16px;opacity:0}.zzz span:nth-child(2){animation-delay:1s}.zzz span:nth-child(3){animation-delay:2s}.stage[data-scene=night] .zzz{color:#e6e7fb}.return-button{display:none;position:absolute;top:125px;left:50%;transform:translateX(-50%);background:#fffef8;border:1px solid #d4ddc9;border-radius:24px;padding:11px 19px;font-size:12px;z-index:4;white-space:nowrap}.stage.is-away .return-button{display:block}.stage.is-away .shadow{opacity:0}.caption{font-size:11px;margin-bottom:17px;padding:0 15px;text-align:center}.stage-actions{padding-bottom:19px}.scene-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px}.scene-options{display:flex;align-items:center;gap:6px}.scene-options>span{font-size:9px;letter-spacing:1px;color:#74826c;margin-right:5px}.scene-choice{width:24px;height:24px;border:3px solid #f5f5ef;border-radius:50%;background:linear-gradient(135deg,#e6edda,#a8bd94);box-shadow:0 0 0 1px #dbe2d4}.scene-choice[data-background=night]{background:linear-gradient(135deg,#2b3953,#8596b4)}.scene-choice[data-background=studio]{background:linear-gradient(135deg,#ede4d5,#baa289)}.scene-choice[aria-pressed=true]{box-shadow:0 0 0 2px var(--accent)}.idle-note{font-size:10px;color:#708063}.chat{height:495px;min-height:0}.messages{height:auto;flex:1;min-height:0}.input-note{font-size:10px;color:#758168}.send:disabled{opacity:.4;cursor:default}.features{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #e0e5d8;padding-top:23px;margin-top:28px;line-height:1.7}.features strong{color:#51634a;font-size:11px;display:block;margin-bottom:5px}.features p{margin:0;font-size:11px}.features span:before{display:none}footer{margin-top:22px}dialog{border:1px solid #dce3d5;border-radius:18px;padding:26px;width:min(440px,calc(100% - 32px));background:#fffefa;color:#263d35;box-shadow:0 20px 80px #20322233}dialog::backdrop{background:#263c3544;backdrop-filter:blur(3px)}.dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.dialog-head h2{font-size:19px;letter-spacing:-.5px;margin:0}.dialog-intro{font-size:12px;color:#6d7c65;line-height:1.7}.setting{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:17px 0;border-bottom:1px solid #e8ecdf;font-size:12px}.setting small{display:block;color:#6d7c65;font-size:11px;margin-top:4px;line-height:1.5}.setting select{max-width:145px;background:#f4f6ed;border:1px solid #dce3d3;border-radius:7px;padding:7px;font-size:11px}.setting input{accent-color:var(--accent);width:17px;height:17px}.settings-note{font-size:11px;color:#6d7c65;line-height:1.7;margin-top:17px}.done{background:var(--accent);color:white;border:0;border-radius:9px;padding:10px 18px;float:right;font-size:12px}@keyframes breathe{50%{transform:translateY(3px) scaleY(.98)}}@keyframes look-around{25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}@keyframes step{to{transform:translateY(-9px)}}@keyframes snore{0%{opacity:0;transform:translate(0,12px) scale(.7)}20%{opacity:.8}80%{opacity:.65}100%{opacity:0;transform:translate(33px,-53px) scale(1.4)}}@keyframes cloud-drift{to{transform:translateX(35px)}}body[data-motion=off] *,body[data-motion=off] *:before,body[data-motion=off] *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}body[data-motion=off] .zzz span{opacity:1;position:static;font-size:17px}body[data-motion=off] .zzz{left:150px;top:-26px;transform:rotate(-10deg)}@media(prefers-reduced-motion:reduce){.zzz span{opacity:1;position:static;font-size:17px}.zzz{left:150px;top:-26px}}@media(max-width:750px){.layout{grid-template-columns:1fr}.picker{gap:7px}.companion-choice{min-width:0;flex:1;padding:11px 9px;gap:7px}.companion-choice small{font-size:9px}.stage{min-height:475px}.chat{height:470px}.header-tools{gap:10px}}@media(max-width:480px){.brand{font-size:18px}.status{display:none}.mini-face{width:28px;height:27px;border-width:4px;gap:5px}.companion-choice strong{font-size:12px}.features{grid-template-columns:1fr;gap:15px}.scene-options>span{font-size:8px}.idle-note{font-size:9px}.intro h1{font-size:30px}.stage-top{padding:21px 17px}}\n/* ===== merged chat engine UI (typing, chips, tools, voice) ===== */\n.chat-head-actions{display:flex;align-items:center;gap:4px}\n.icon-btn{border:1px solid #dfe4d8;background:#fffefa;color:#5d6f54;border-radius:8px;width:30px;height:30px;display:grid;place-items:center;font-size:13px;padding:0}\n.icon-btn:hover{background:#f1f5ea}\n.icon-btn.mrg-voice-on{background:var(--accent);border-color:var(--accent);color:#fff}\n.icon-btn svg{width:14px;height:14px}\n.bot-tools{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}\n.mrg3-mini{border:1px solid #d9e0cf;background:#fffefb;color:#61735a;border-radius:7px;padding:3px 9px;font-size:10px;line-height:1.6}\n.mrg3-mini:hover{background:#eef3e7}\n.mrg3-speak-btn.mrg-speaking{background:var(--accent);border-color:var(--accent);color:#fff}\n.link-btn{display:inline-block;margin-top:9px;border:1px solid var(--accent);background:transparent;color:var(--accent);border-radius:8px;padding:6px 11px;font-size:11px;font-weight:600}\n.link-btn:hover{background:var(--accent);color:#fff}\n.user .bubble .link-btn{border-color:#fff;color:#fff}\n.typing{display:inline-flex;gap:4px;align-items:center;background:#f0f2e9;border-radius:0 13px 13px 13px;padding:13px 15px}\n.typing span{width:6px;height:6px;border-radius:50%;background:#9bab8e;animation:blip 1.1s infinite}\n.typing span:nth-child(2){animation-delay:.16s}\n.typing span:nth-child(3){animation-delay:.32s}\n@keyframes blip{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}\n.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 0 16px 36px;margin-top:-6px}\n.chip{border:1px solid #dde4d4;color:#5e7155;background:#fffefa;border-radius:20px;padding:6px 12px;font-size:11px;text-align:left;line-height:1.4}\n.chip:hover{background:#edf2e5;border-color:var(--accent)}\n.mic{border:0;background:transparent;color:#7d8c74;width:32px;height:32px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;padding:0}\n.mic svg{width:17px;height:17px;fill:currentColor}\n.mic:hover{background:#f0f3ea;color:var(--accent)}\n.mic.mrg-listening{background:#e2503f;color:#fff;animation:pulse-mic 1.2s infinite}\n@keyframes pulse-mic{50%{box-shadow:0 0 0 6px #e2503f22}}\n.voice-status{margin:0 22px 6px;font-size:10px;color:#6f7f66;min-height:13px;text-align:center}\n.voice-status.mrg-error{color:#b4503d}\n.bubble{white-space:pre-wrap}\n.messages{scrollbar-width:thin}\n\n/* ===== widget shell (shadow DOM) ===== */\n:host{\n  --accent:#365f4b;--soft:#e6eddc;--shell:#c4d99f;--rim:#97b576;\n  --shine:#e2edca;--visor:#2d493e;--light:#e8f4bd;--limb:#acc587;\n  all:initial;\n  position:fixed;bottom:0;right:0;width:0;height:0;\n  z-index:2147483000;\n  font-family:system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;\n  color:#27392f;\n  font-synthesis:none;\n  overflow:hidden;\n}\n:host([data-motion=off]) *,:host([data-motion=off]) *:before,:host([data-motion=off]) *:after{\n  animation:none!important;transition:none!important;scroll-behavior:auto!important;\n}\n:host([data-motion=off]) .zzz span{opacity:1;position:static;font-size:17px}\n:host([data-motion=off]) .zzz{left:150px;top:-26px;transform:rotate(-10deg)}\n\n.mrg-fab{\n  position:fixed;right:20px;bottom:20px;width:52px;height:52px;border-radius:50%;\n  border:0;background:var(--accent);box-shadow:0 10px 28px #24382a4d;\n  display:grid;place-items:center;cursor:pointer;transition:transform .2s;\n}\n.mrg-fab:hover{transform:translateY(-3px)}\n.mrg-fab-face{\n  width:26px;height:23px;background:var(--visor);border:3px solid var(--shell);\n  border-radius:9px;display:flex;align-items:center;justify-content:center;gap:5px;\n}\n.mrg-fab-face i{width:3px;height:7px;background:var(--light);border-radius:3px;animation:blink 5s infinite}\n.mrg-fab-dot{position:absolute;top:4px;right:4px;width:10px;height:10px;border-radius:50%;background:#74a264;border:2px solid #fff}\n\n/*\n  The stage below is intentionally height:auto. A hard-coded height here\n  previously drifted out of sync with the actual content height (robot +\n  speech bubble + buttons), which caused the buttons/robot to spill out\n  and overlap the message list underneath. Sizing it from its own content\n  makes that class of bug structurally impossible.\n*/\n.mrg-panel{\n  position:fixed;right:20px;bottom:20px;\n  width:328px;height:min(500px,calc(100vh - 40px));\n  background:#fffefa;border:1px solid #dfe3d8;border-radius:20px;\n  box-shadow:0 26px 70px #22332433;\n  display:none;flex-direction:column;overflow:hidden;\n}\n:host(.open) .mrg-panel{display:flex}\n:host(.open) .mrg-fab{display:none}\n\n.mrg-head{display:flex;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid #edeee4;flex-shrink:0}\n.mrg-head-mark{width:30px;height:30px;border-radius:10px;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:14px;flex-shrink:0}\n.mrg-head-text{flex:1;min-width:0}\n.mrg-head-title{font-size:13px;font-weight:700;letter-spacing:-.3px}\n.mrg-head-sub{font-size:9.5px;color:#8b9484;display:flex;align-items:center;gap:5px;margin-top:2px}\n.mrg-head-actions{display:flex;gap:2px;flex-shrink:0}\n.icon-btn{width:26px;height:26px}\n\n.stage{\n  height:auto;min-height:0;flex-shrink:0;\n  border:0;border-bottom:1px solid #e6e9dd;border-radius:0;\n  overflow:hidden;padding-bottom:10px;\n}\n.stage-top{padding:9px 12px 0;font-size:8.5px}\n.pill{font-size:8.5px;padding:3px 7px}\n.speech{\n  margin:6px auto 0;font-size:11px;line-height:1.4;padding:7px 12px;\n  min-height:0;max-width:88%;\n}\n.world{height:112px;flex-shrink:0;margin-top:4px}\n.actor{top:18px;transform:scale(.52);transform-origin:50% 0}\n.actor.leaving,.actor.away{transform:scale(.52) translateX(420px)}\n.shadow{bottom:16px;width:76px}\n.caption{display:none}\n.return-button{top:52px;padding:7px 12px;font-size:10px}\n.stage-actions{padding:0 12px;align-items:center;justify-content:center;gap:6px;flex-wrap:nowrap}\n.small-btn{padding:6px 9px;font-size:10.5px;flex:0 0 auto}\n\n.messages{flex:1;min-height:60px;height:auto;padding:14px 14px 2px;overflow-x:hidden}\n.message{margin-bottom:12px}\n.bubble{font-size:12px;max-width:88%}\n.chips{padding:0 0 12px 36px;overflow-x:hidden}\n.chip{max-width:100%;box-sizing:border-box}\nform{margin:0 12px 7px}\ninput{font-size:12.5px}\n.voice-status{margin:0 14px 4px}\n.input-note{margin:0 10px 10px;font-size:9px}\n\n/* the scene switcher now lives inside settings, as a compact row of dots */\n.setting .scene-options{display:inline-flex;gap:6px}\n.setting .scene-choice{width:20px;height:20px;border-width:2px}\n\n.mrg-settings{\n  position:absolute;inset:0;z-index:8;background:#fffefa;padding:18px;overflow:auto;display:none;\n}\n.mrg-settings.open{display:block}\n.dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.dialog-head h2{font-size:16px;letter-spacing:-.5px;margin:0 0 4px}\n.setting{padding:13px 0;font-size:11.5px}\n.settings-note{font-size:10px}\n.idle-note{display:block;font-size:9.5px;margin-top:9px}\n.done{margin-top:12px}\n\n@media(max-width:400px){\n  .mrg-panel{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0;border:0}\n  .mrg-fab{right:16px;bottom:16px}\n}\n";

  var WIDGET_MARKUP = "<button class=\"mrg-fab\" type=\"button\" aria-label=\"Open Mirage assistant\">\n  <span class=\"mrg-fab-face\" aria-hidden=\"true\">\n    <i></i><i></i>\n  </span>\n  <span class=\"mrg-fab-dot\"></span>\n</button>\n\n<div class=\"mrg-panel\" role=\"dialog\" aria-label=\"Chat with Mirage\">\n\n  <div class=\"mrg-head\">\n\n    <div class=\"mrg-head-mark\" aria-hidden=\"true\">\u2733</div>\n\n    <div class=\"mrg-head-text\">\n      <div class=\"mrg-head-title\">Mirage</div>\n      <div class=\"mrg-head-sub\"><i class=\"dot\"></i> Offline &amp; private</div>\n    </div>\n\n    <div class=\"mrg-head-actions\">\n\n      <button class=\"icon-btn\" id=\"voice-toggle\" type=\"button\" aria-pressed=\"false\"\n        title=\"Turn spoken responses on\" aria-label=\"Turn spoken responses on\">\n        <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M3 10v4h4l5 5V5L7 10H3z\"/></svg>\n      </button>\n\n      <button class=\"icon-btn\" id=\"settings-open\" type=\"button\" title=\"Settings\" aria-label=\"Settings\">\u2699</button>\n\n      <button class=\"icon-btn\" id=\"clear\" type=\"button\" title=\"Clear conversation\" aria-label=\"Clear conversation\">\u21ba</button>\n\n      <button class=\"icon-btn\" id=\"mrg-close\" type=\"button\" title=\"Close\" aria-label=\"Close\">\u00d7</button>\n\n    </div>\n\n  </div>\n\n  <section class=\"stage\" id=\"scene\" data-scene=\"meadow\" aria-label=\"Mirage's habitat\">\n\n    <div class=\"landscape\" aria-hidden=\"true\">\n      <div class=\"stars\"></div>\n      <div class=\"sun\"></div>\n      <div class=\"cloud\"></div>\n      <div class=\"hill back\"></div>\n      <div class=\"hill\"></div>\n      <div class=\"plant\"></div>\n    </div>\n\n    <div class=\"stage-top\">\n      <span id=\"stage-label\">MIRAGE</span>\n      <span class=\"pill\" id=\"mood\" role=\"status\">\u25cf Ready to help</span>\n    </div>\n\n    <div class=\"speech\" id=\"speech\">Oh, hello there! \ud83c\udf31</div>\n\n    <div class=\"world\">\n      <div class=\"shadow\"></div>\n      <div class=\"actor\" id=\"actor\">\n        <div class=\"robot\" id=\"robot\" role=\"img\" aria-label=\"Mirage, a friendly green robot\">\n          <div class=\"antenna\"></div>\n          <div class=\"ear\"></div>\n          <div class=\"ear right\"></div>\n          <div class=\"arm\"></div>\n          <div class=\"arm right\"></div>\n          <div class=\"foot\"></div>\n          <div class=\"foot right\"></div>\n          <div class=\"head\">\n            <div class=\"face\">\n              <div class=\"eyes\"><div class=\"eye\"></div><div class=\"eye\"></div></div>\n              <div class=\"cheek\"></div>\n              <div class=\"cheek right\"></div>\n              <div class=\"mouth\"></div>\n            </div>\n          </div>\n          <div class=\"zzz\" aria-hidden=\"true\"><span>z</span><span>z</span><span>Z</span></div>\n        </div>\n      </div>\n      <button class=\"return-button\" id=\"recall\">Come back, Mirage \u2197</button>\n    </div>\n\n    <p class=\"caption\" id=\"caption\">Move your cursor. You have my attention.</p>\n\n    <div class=\"stage-actions\">\n      <button class=\"small-btn\" data-command=\"wave\">Wave \u2197</button>\n      <button class=\"small-btn\" data-command=\"dance\">Dance \u266b</button>\n      <button class=\"small-btn\" id=\"nap\" data-command=\"sleep\">Nap \u263e</button>\n    </div>\n\n  </section>\n\n  <div class=\"messages\" id=\"messages\" role=\"log\" aria-live=\"polite\" aria-label=\"Conversation\"></div>\n\n  <form id=\"chat-form\">\n    <label class=\"sr-only\" for=\"message-input\">Message Mirage</label>\n    <input id=\"message-input\" maxlength=\"300\" autocomplete=\"off\" placeholder=\"Ask Mirage anything\u2026\">\n    <button class=\"mic\" id=\"mic\" type=\"button\" aria-label=\"Speak your question\" title=\"Speak your question\">\n      <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n        <path d=\"M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z\"/>\n        <path d=\"M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11h-2z\"/>\n      </svg>\n    </button>\n    <button class=\"send\" aria-label=\"Send message\" type=\"submit\">\u2191</button>\n  </form>\n\n  <div class=\"voice-status\" id=\"voice-status\" aria-live=\"polite\"></div>\n\n  <p class=\"input-note\">Enter to send \u00b7 Nothing leaves this browser</p>\n\n  <div class=\"mrg-settings\" id=\"settings\" aria-label=\"Settings\">\n\n    <div class=\"dialog-head\">\n      <h2 id=\"settings-title\">Make yourself at home.</h2>\n      <button class=\"icon-btn\" id=\"settings-close\" aria-label=\"Close settings\">\u2715</button>\n    </div>\n\n    <label class=\"setting\">\n      <span>Idle activities<small>Let Mirage act on its own.</small></span>\n      <input type=\"checkbox\" id=\"idle-setting\" checked>\n    </label>\n\n    <label class=\"setting\">\n      <span>Idle pace<small id=\"pace-description\">Play at 20s, nap at 60s, leave at 100s.</small></span>\n      <select id=\"pace-setting\">\n        <option value=\"normal\">Relaxed</option>\n        <option value=\"demo\">Quick demo</option>\n      </select>\n    </label>\n\n    <label class=\"setting\">\n      <span>Wander off<small>Leave the scene after a long nap.</small></span>\n      <input type=\"checkbox\" id=\"wander-setting\" checked>\n    </label>\n\n    <label class=\"setting\">\n      <span>Animations<small>Your device's reduced-motion setting also applies.</small></span>\n      <input type=\"checkbox\" id=\"motion-setting\" checked>\n    </label>\n\n    <label class=\"setting\">\n      <span>Background<small>The scene behind Mirage.</small></span>\n      <span class=\"scene-options\" role=\"group\" aria-label=\"Background\">\n        <button class=\"scene-choice\" data-background=\"meadow\" aria-label=\"Meadow background\" title=\"Meadow\" aria-pressed=\"true\"></button>\n        <button class=\"scene-choice\" data-background=\"night\" aria-label=\"Night sky background\" title=\"Night sky\" aria-pressed=\"false\"></button>\n        <button class=\"scene-choice\" data-background=\"studio\" aria-label=\"Quiet studio background\" title=\"Quiet studio\" aria-pressed=\"false\"></button>\n      </span>\n    </label>\n\n    <p class=\"settings-note\" id=\"settings-note\">Only your preferences and remembered name are saved on this device. Messages stay in memory.</p>\n\n    <span class=\"idle-note\" id=\"idle-note\">Idle moments, little surprises.</span>\n\n    <button class=\"done\" id=\"settings-done\">All set</button>\n\n  </div>\n\n</div>\n";

  function boot() {

    var host = document.createElement('div');
    host.className = 'mirage-companion';
    host.setAttribute('data-motion', 'on');

    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = WIDGET_CSS;
    shadow.appendChild(style);

    var frame = document.createElement('div');
    frame.innerHTML = WIDGET_MARKUP;
    while (frame.firstChild) {
      shadow.appendChild(frame.firstChild);
    }

    document.body.appendChild(host);

    var IS_WIDGET = true;
    var D = shadow;
    var SCOPE = host;

  /* =======================================================================
     KNOWLEDGE BASE
     ======================================================================= */

  var KNOWLEDGE = [

    {
      id: "about",

      topic: "website",

      title: "About the Verification Suite",

      patterns: [
        "what is this website",
        "what is this site",
        "what is this portal",
        "what does this website do",
        "what does this site do",
        "what does this portal do",
        "what can this website do",
        "what can i do here",
        "tell me about this website",
        "tell me about this site",
        "tell me about this portal",
        "explain this website",
        "explain this site",
        "purpose of this website",
        "purpose of this site",
        "purpose of this portal",
        "why is this website",
        "what is verification suite",
        "about verification suite",
        "verification suite"
      ],

      keywords: [
        "website",
        "site",
        "portal",
        "verification",
        "suite",
        "purpose"
      ],

      answer:
        "The Verification Suite is an internal portal for the Controller of Examinations at Medhavi Skills University.\n\n" +

        "It brings together two main verification tools:\n\n" +

        "① Marksheet vs TR Verification\n" +
        "Compares issued gradesheet PDFs with the Tabulation Register (TR).\n\n" +

        "② White vs Original Verification\n" +
        "Checks white-background copies against sealed originals and provides additional checks such as SGPA & Percentage, Withheld Students, and Failed Candidates.\n\n" +

        "The tools run directly in the browser and generate Excel reports for verification.",

      link: {
        label: "Explore Verification Suite",
        url: "PORTAL#overview"
      },

      suggestions: [
        "What tools are available?",
        "How does Tool 1 work?",
        "How does Tool 2 work?"
      ]

    },


    {
      id: "tools",

      topic: "tools",

      title: "Available Tools",

      patterns: [
        "what tools are available",
        "which tools are available",
        "what tools do you have",
        "what tools does this website have",
        "what can i use",
        "list the tools",
        "show me the tools",
        "tell me the tools",
        "how many tools",
        "two tools",
        "available tools"
      ],

      keywords: [
        "tools",
        "available",
        "tool",
        "verification"
      ],

      answer:
        "There are two main verification tools in the suite:\n\n" +

        "① Marksheet vs TR Verification\n" +
        "Used to compare gradesheet PDFs against the Tabulation Register.\n\n" +

        "② White vs Original Verification\n" +
        "Used for White vs Original comparison and additional academic checks including SGPA & Percentage, Withheld Students, and Failed Candidates.\n\n" +

        "Both tools work independently.",

      link: {
        label: "View Tools",
        url: "PORTAL#tools"
      },

      suggestions: [
        "How do I use Tool 1?",
        "How do I use Tool 2?",
        "What is TR?"
      ]

    },


    {
      id: "tool1",

      topic: "tool1",

      title: "Marksheet vs TR Verification",

      patterns: [
        "what is tool 1",
        "what is tool one",
        "tell me about tool 1",
        "tell me about tool one",
        "marksheet vs tr",
        "marksheet verification",
        "gradesheet verification",
        "tr verification",
        "marksheet against tr",
        "compare marksheet with tr",
        "how does tool 1 work",
        "how does tool one work",
        "how do i use tool 1",
        "how do i use tool one",
        "how to use marksheet verification",
        "how to verify marksheet",
        "verify gradesheet",
        "all in one",
        "allinone"
      ],

      keywords: [
        "marksheet",
        "gradesheet",
        "tr",
        "verification",
        "tool",
        "compare"
      ],

      answer:
        "Tool 1 is the Marksheet vs TR Verification tool.\n\n" +

        "Its purpose is to compare the information in gradesheet PDFs with the Tabulation Register (TR).\n\n" +

        "Typical workflow:\n\n" +

        "1. Load the TR Excel file.\n" +
        "2. Add the gradesheet PDF files.\n" +
        "3. The tool detects the required format.\n" +
        "4. Registration Number is used to match records.\n" +
        "5. The gradesheet information is compared with the TR.\n" +
        "6. Review the verification results.\n" +
        "7. Download the Excel report.\n\n" +

        "The tool is designed for batch verification.",

      link: {
        label: "Open Marksheet vs TR",
        url: "TOOL1"
      },

      suggestions: [
        "What is TR?",
        "What happens if a PDF has an error?",
        "What format is the report?"
      ]

    },


    {
      id: "tool2",

      topic: "tool2",

      title: "White vs Original Verification",

      patterns: [
        "what is tool 2",
        "what is tool two",
        "tell me about tool 2",
        "tell me about tool two",
        "white vs original",
        "white original",
        "original verification",
        "white background verification",
        "sealed original",
        "how does tool 2 work",
        "how does tool two work",
        "how do i use tool 2",
        "how do i use tool two"
      ],

      keywords: [
        "white",
        "original",
        "verification",
        "sealed",
        "tool"
      ],

      answer:
        "Tool 2 is the White vs Original Verification toolkit.\n\n" +

        "It contains four main checks:\n\n" +

        "① White vs Original\n" +
        "Compares white-background copies against the sealed originals.\n\n" +

        "② SGPA & Percentage\n" +
        "Recalculates and verifies academic values from the gradesheet.\n\n" +

        "③ Withheld Students\n" +
        "Checks the TR for students marked with W in the Grace column.\n\n" +

        "④ Failed Candidates\n" +
        "Identifies failed students and can cross-check the PDF and TR lists.\n\n" +

        "Each check produces an Excel report.",

      link: {
        label: "Open White vs Original",
        url: "TOOL2"
      },

      suggestions: [
        "How is SGPA calculated?",
        "How are failed candidates checked?",
        "What does Withheld mean?"
      ]

    },


    {
      id: "tr",

      topic: "tr",

      title: "Tabulation Register",

      patterns: [
        "what is tr",
        "what does tr mean",
        "tr meaning",
        "meaning of tr",
        "what is tabulation register",
        "what is the tabulation register",
        "what is tabulated result",
        "what is the tabulated result",
        "explain tr",
        "tell me about tr"
      ],

      keywords: [
        "tr",
        "tabulation",
        "register",
        "result"
      ],

      answer:
        "TR refers to the Tabulation Register, also described as the tabulated result.\n\n" +

        "It contains the official student result information used as the reference when verifying gradesheet PDFs.\n\n" +

        "In the Marksheet vs TR tool, the Registration Number is used as the main matching key between the gradesheet and TR.",

      suggestions: [
        "How does Tool 1 use the TR?",
        "What if my PDF has an error?",
        "What format is the report?"
      ]

    },


    {
      id: "sgpa",

      topic: "sgpa",

      title: "SGPA and Percentage",

      patterns: [
        "what is sgpa",
        "what is percentage",
        "how is sgpa calculated",
        "how do you calculate sgpa",
        "how is percentage calculated",
        "how do you calculate percentage",
        "calculate sgpa",
        "calculate percentage",
        "recalculate sgpa",
        "recalculate percentage",
        "recompute sgpa",
        "sgpa calculation",
        "percentage calculation",
        "credit points",
        "how does sgpa work"
      ],

      keywords: [
        "sgpa",
        "percentage",
        "calculate",
        "recalculate",
        "credit",
        "points"
      ],

      answer:
        "The SGPA & Percentage check recalculates the academic values from the gradesheet data.\n\n" +

        "Percentage is calculated from total obtained marks and maximum marks.\n\n" +

        "SGPA is calculated using total credit points divided by total credits.\n\n" +

        "The calculated SGPA and Percentage are rounded to one decimal place before being compared with the printed values.\n\n" +

        "The tool also checks supporting values such as credit points and totals.",

      suggestions: [
        "What if the printed SGPA is wrong?",
        "What is a credit point?",
        "What does Tool 2 do?"
      ]

    },


    {
      id: "failed",

      topic: "failed",

      title: "Failed Candidates",

      patterns: [
        "failed candidates",
        "failed candidate",
        "failed students",
        "who failed",
        "find failed students",
        "how are failed students checked",
        "how does failed check work",
        "failure check",
        "fail check",
        "what counts as failed",
        "student failed",
        "candidate failed"
      ],

      keywords: [
        "failed",
        "fail",
        "failure",
        "candidate",
        "student"
      ],

      answer:
        "The Failed Candidates check identifies students whose academic records indicate a failed result.\n\n" +

        "The check can use gradesheet PDFs, the TR, or both sources.\n\n" +

        "When both sources are supplied, Mirage's verification tool can cross-check the two lists and identify differences between the PDF and TR results.",

      suggestions: [
        "What is Withheld?",
        "How does SGPA verification work?",
        "What is Tool 2?"
      ]

    },


    {
      id: "withheld",

      topic: "withheld",

      title: "Withheld Students",

      patterns: [
        "what is withheld",
        "what does withheld mean",
        "withheld students",
        "withheld student",
        "who is withheld",
        "how are withheld students checked",
        "how does withheld check work",
        "grace column",
        "w in grace",
        "w in the grace column"
      ],

      keywords: [
        "withheld",
        "grace",
        "w",
        "student"
      ],

      answer:
        "The Withheld Students check looks at the TR's Grace column.\n\n" +

        "A student is treated as WITHHELD when a subject's Grace cell contains the letter W.\n\n" +

        "A numeric grace value such as 4 or 2.5 is not treated as the W withheld indicator.",

      suggestions: [
        "How are failed students checked?",
        "What is TR?",
        "What does Tool 2 do?"
      ]

    },


    {
      id: "security",

      topic: "security",

      title: "Privacy and Security",

      patterns: [
        "is my data safe",
        "is this safe",
        "is my file safe",
        "what about privacy",
        "privacy",
        "security",
        "is it secure",
        "are my files uploaded",
        "does it upload my files",
        "does this upload files",
        "do files leave my computer",
        "does data leave my computer",
        "does it use a server",
        "does this use a server",
        "where does my data go"
      ],

      keywords: [
        "data",
        "safe",
        "privacy",
        "security",
        "files",
        "upload",
        "server"
      ],

      answer:
        "The verification tools are designed to process the uploaded PDFs and TR files directly in your browser.\n\n" +

        "The current widget itself makes no API calls and does not send your chat messages to an AI server.\n\n" +

        "For sensitive examination files, you should still follow your organization's document-handling and access-control policies.",

      link: {
        label: "Read the Portal Notice",
        url: "PORTAL#about"
      },

      suggestions: [
        "What does this website do?",
        "What tools are available?",
        "How does Tool 1 work?"
      ]

    },


    {
      id: "pdf-error",

      topic: "pdf",

      title: "PDF Errors",

      patterns: [
        "pdf error",
        "pdf is not working",
        "pdf not working",
        "pdf cannot be read",
        "pdf can't be read",
        "pdf cant be read",
        "file cannot be read",
        "file not reading",
        "scanned pdf",
        "no text layer",
        "pdf has no text",
        "corrupt pdf",
        "broken pdf",
        "failed to load pdf",
        "pdf failed"
      ],

      keywords: [
        "pdf",
        "error",
        "read",
        "scanned",
        "text",
        "file"
      ],

      answer:
        "If a PDF cannot be read, first check whether it contains a proper text layer.\n\n" +

        "A scanned image-only PDF may not contain extractable text, which can prevent the verification tool from reading the required fields.\n\n" +

        "Try testing that PDF individually and make sure you are using a valid text-based gradesheet export.",

      suggestions: [
        "What if the verification is slow?",
        "What format is the report?",
        "How does Tool 1 work?"
      ]

    },


    {
      id: "performance",

      topic: "performance",

      title: "Large Batch Performance",

      patterns: [
        "why is it slow",
        "why is it lagging",
        "verification is slow",
        "verification is lagging",
        "it is slow",
        "it is lagging",
        "large batch",
        "many pdfs",
        "many files",
        "too many files",
        "1000 pdf",
        "1000 pdfs",
        "browser is freezing",
        "page is freezing",
        "tool is stuck",
        "verification is stuck"
      ],

      keywords: [
        "slow",
        "lag",
        "large",
        "batch",
        "files",
        "pdf",
        "freeze",
        "stuck"
      ],

      answer:
        "Large batches require more browser processing because the PDFs are being handled locally.\n\n" +

        "For a smoother run:\n\n" +

        "• Avoid refreshing the page during verification.\n" +
        "• Keep the verification tab open.\n" +
        "• For very large batches, split the files into smaller groups.\n" +
        "• Allow the browser some time to finish processing.",

      suggestions: [
        "What if a PDF gives an error?",
        "How does Tool 1 work?",
        "What format is the report?"
      ]

    },


    {
      id: "report",

      topic: "report",

      title: "Excel Reports",

      patterns: [
        "what format is the report",
        "what report does it produce",
        "what file does it produce",
        "what output do i get",
        "what is the output",
        "excel report",
        "xlsx report",
        "download report",
        "report format",
        "where is the report",
        "verification report"
      ],

      keywords: [
        "report",
        "excel",
        "xlsx",
        "output",
        "download"
      ],

      answer:
        "The verification tools generate downloadable Excel (.xlsx) reports.\n\n" +

        "Marksheet vs TR Verification generates a verification workbook.\n\n" +

        "White vs Original Verification generates reports for its individual verification checks.",

      suggestions: [
        "How does Tool 1 work?",
        "How does Tool 2 work?",
        "What is TR?"
      ]

    },


    {
      id: "login",

      topic: "login",

      patterns: [
        "how do i login",
        "how do i log in",
        "how do i sign in",
        "how to login",
        "how to log in",
        "how to sign in",
        "login",
        "log in",
        "sign in",
        "signin",
        "staff id",
        "staff login",
        "password",
        "forgot password",
        "cannot login",
        "cant login",
        "login problem",
        "sign in problem"
      ],

      keywords: [
        "login",
        "signin",
        "password",
        "staff",
        "credentials"
      ],

      answer:
        "Use the Staff ID and password issued to your examination office team.\n\n" +

        "If you cannot sign in, verify that you are using the latest credentials provided to you.\n\n" +

        "The portal does not provide a self-service password reset.",

      suggestions: [
        "What does this website do?",
        "What tools are available?",
        "Is my data safe?"
      ]

    },


    {
      id: "workflow",

      topic: "workflow",

      patterns: [
        "how does this work",
        "how does the website work",
        "how does the portal work",
        "how does verification work",
        "what is the workflow",
        "what is the process",
        "what are the steps",
        "overall process",
        "overall workflow",
        "from login to report"
      ],

      keywords: [
        "workflow",
        "process",
        "steps",
        "verification",
        "report"
      ],

      answer:
        "The general workflow is simple:\n\n" +

        "1. Sign in to the Verification Suite.\n" +
        "2. Select the required verification tool.\n" +
        "3. Load the required PDFs or TR file.\n" +
        "4. Run the verification.\n" +
        "5. Review the findings.\n" +
        "6. Download the Excel report.\n\n" +

        "You can return to the portal whenever you need to use another verification tool.",

      link: {
        label: "See the Workflow",
        url: "PORTAL#workflow"
      },

      suggestions: [
        "What tools are available?",
        "How does Tool 1 work?",
        "How does Tool 2 work?"
      ]

    },

    {
      id: "darkmode",

      topic: "ui",

      patterns: [
        "dark mode",
        "dark theme",
        "light mode",
        "theme",
        "change theme",
        "switch theme",
        "night mode"
      ],

      keywords: [
        "dark",
        "light",
        "theme",
        "mode"
      ],

      answer:
        "Yes. The Verification Suite supports light and dark themes.\n\n" +

        "Use the theme control on the portal to switch between them. Your selected theme can be remembered on the device.",

      suggestions: [
        "What does this website do?",
        "What tools are available?"
      ]

    }

  ];


  /* =======================================================================
     NORMALIZATION
     ======================================================================= */

  function normalize(text) {

    return String(text || "")

      .toLowerCase()

      .replace(/[\u2018\u2019]/g, "'")

      .replace(/[\u201c\u201d]/g, '"')

      .replace(/[^\w\s']/g, " ")

      .replace(/\s+/g, " ")

      .trim();

  }


  /* =======================================================================
     WORDS
     ======================================================================= */

  var STOPWORDS = new Set([

    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "am",
    "be",
    "been",
    "being",

    "i",
    "me",
    "my",
    "mine",

    "you",
    "your",
    "yours",

    "we",
    "our",
    "ours",

    "they",
    "their",

    "this",
    "that",
    "these",
    "those",
    "it",
    "its",

    "and",
    "or",
    "but",
    "if",
    "then",
    "so",

    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "from",
    "with",
    "without",
    "by",
    "as",

    "do",
    "does",
    "did",

    "can",
    "could",
    "would",
    "should",
    "will",
    "shall",
    "may",
    "might",
    "must",

    "what",
    "which",
    "who",
    "whom",
    "how",
    "why",
    "when",
    "where",

    "tell",
    "please",
    "just",
    "really",
    "very",
    "also",
    "about",

    "have",
    "has",
    "had",
    "get",
    "give",

    "here",
    "there",
    "now"

  ]);


  function meaningful(word) {

    return word &&
      word.length > 1 &&
      !STOPWORDS.has(word);

  }


  /* =======================================================================
     TYPO TOLERANCE
     ======================================================================= */

  function levenshtein(a, b) {

    if (a === b) return 0;

    if (!a.length) return b.length;

    if (!b.length) return a.length;


    var previous = [];

    var current = [];


    for (var j = 0; j <= b.length; j++) {

      previous[j] = j;

    }


    for (var i = 1; i <= a.length; i++) {

      current[0] = i;


      for (var j2 = 1; j2 <= b.length; j2++) {

        var cost =
          a.charAt(i - 1) === b.charAt(j2 - 1)
            ? 0
            : 1;


        current[j2] = Math.min(

          current[j2 - 1] + 1,

          previous[j2] + 1,

          previous[j2 - 1] + cost

        );

      }


      var temp = previous;

      previous = current;

      current = temp;

    }


    return previous[b.length];

  }


  function fuzzyWordMatch(a, b) {

    if (!a || !b) return false;

    if (a === b) return true;


    if (a.length <= 3 || b.length <= 3) {

      return false;

    }


    var distance =
      levenshtein(a, b);


    var maxLength =
      Math.max(a.length, b.length);


    return (
      distance <= 1 ||
      (
        maxLength >= 7 &&
        distance <= 2
      )
    );

  }


  /* =======================================================================
     SCORING
     ======================================================================= */

  function scoreKnowledge(text, item) {

    var input =
      normalize(text);


    if (!input) {

      return 0;

    }


    var score = 0;


    /*
      Exact complete question.
    */

    item.patterns.forEach(function (pattern) {

      var p =
        normalize(pattern);


      if (input === p) {

        score += 100;

      }

      else if (
        input.indexOf(p) !== -1
      ) {

        score +=
          20 +
          p.split(" ").length * 4;

      }

    });


    /*
      Word-level matching.
    */

    var inputWords =
      input
        .split(" ")
        .filter(meaningful);


    var keywordWords = [];


    item.keywords.forEach(function (keyword) {

      normalize(keyword)
        .split(" ")
        .filter(meaningful)
        .forEach(function (word) {

          keywordWords.push(word);

        });

    });


    inputWords.forEach(function (inputWord) {

      keywordWords.forEach(function (keywordWord) {

        if (
          inputWord === keywordWord
        ) {

          score += 5;

        }

        else if (
          fuzzyWordMatch(
            inputWord,
            keywordWord
          )
        ) {

          score += 2;

        }

      });

    });


    return score;

  }


  function findBestKnowledge(text) {

    var best = null;

    var bestScore = 0;

    var secondScore = 0;


    KNOWLEDGE.forEach(function (item) {

      var score =
        scoreKnowledge(
          text,
          item
        );


      if (score > bestScore) {

        secondScore = bestScore;

        bestScore = score;

        best = item;

      }

      else if (score > secondScore) {

        secondScore = score;

      }

    });


    return {

      item: best,

      score: bestScore,

      secondScore: secondScore

    };

  }


  /* =======================================================================
     MEMORY
     ======================================================================= */

  var memory = {

    name: null,

    lastTopic: null,

    lastIntent: null,

    lastTool: null,

    history: [],

    greeted: false

  };


  function loadMemory() {

    try {

      var saved =
        localStorage.getItem(
          CFG.storageKey
        );


      if (!saved) return;


      var data =
        JSON.parse(saved);


      if (!data) return;


      memory.name =
        data.name || null;

    }

    catch (e) {

      /* Ignore storage errors */

    }

  }


  function saveMemory() {

    try {

      localStorage.setItem(

        CFG.storageKey,

        JSON.stringify({

          name:
            memory.name

        })

      );

    }

    catch (e) {

      /* Ignore */

    }

  }


  function rememberMessage(
    role,
    text
  ) {

    memory.history.push({

      role: role,

      text: text,

      time: Date.now()

    });


    if (
      memory.history.length >
      CFG.maxHistory
    ) {

      memory.history.shift();

    }

  }


  loadMemory();


  /* =======================================================================
     NAME EXTRACTION
     ======================================================================= */

  function extractName(text) {

    var original =
      String(text || "")
        .trim();


    var t =
      normalize(original);


    var patterns = [

      /(?:my name is)\s+(.+)$/i,

      /(?:i am)\s+(.+)$/i,

      /(?:i'm)\s+(.+)$/i,

      /(?:im)\s+(.+)$/i,

      /(?:this is)\s+(.+)$/i,

      /(?:call me)\s+(.+)$/i,

      /(?:you can call me)\s+(.+)$/i,

      /(?:name is)\s+(.+)$/i

    ];


    for (
      var i = 0;
      i < patterns.length;
      i++
    ) {

      var match =
        original.match(
          patterns[i]
        );


      if (match) {

        var candidate =
          match[1]
            .replace(/[.!?,]+$/g, "")
            .trim();


        if (
          isReasonableName(
            candidate
          )
        ) {

          return formatName(
            candidate
          );

        }

      }

    }


    /*
      "Ayush here"
    */

    var hereMatch =
      original.match(
        /^([A-Za-z][A-Za-z'-]{1,20})\s+here$/i
      );


    if (hereMatch) {

      return formatName(
        hereMatch[1]
      );

    }


    return null;

  }


  function isReasonableName(name) {

    if (!name) return false;


    var words =
      name
        .trim()
        .split(/\s+/);


    if (
      words.length < 1 ||
      words.length > 3
    ) {

      return false;

    }


    var banned = [

      "hello",
      "hi",
      "hey",
      "good",
      "morning",
      "afternoon",
      "evening",
      "night",
      "help",
      "question",
      "website",
      "portal",
      "tool",
      "verification",
      "marksheet",
      "gradesheet"

    ];


    return words.every(
      function (word) {

        var clean =
          normalize(word);


        return (
          clean.length >= 2 &&
          !banned.includes(clean)
        );

      }
    );

  }


  function formatName(name) {

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map(function (word) {

        return (
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase()
        );

      })
      .join(" ");

  }


  /* =======================================================================
     GREETINGS
     ======================================================================= */

  function getTimeGreeting() {

    var hour =
      new Date().getHours();


    if (hour < 12) {

      return "Good morning";

    }


    if (hour < 17) {

      return "Good afternoon";

    }


    if (hour < 21) {

      return "Good evening";

    }


    return "Hello";

  }


  function isGreeting(text) {

    var n =
      normalize(text);


    return /^(hi|hello|hey|hiya|hey there|hello there|good morning|good afternoon|good evening|good night)$/
      .test(n);

  }


  function isGreetingWithName(text) {

    return /^(hi|hello|hey|good morning|good afternoon|good evening|good night)\b/i
      .test(text) &&
      (
        /my name is/i.test(text) ||
        /i am/i.test(text) ||
        /i'm/i.test(text) ||
        /\bim\b/i.test(text) ||
        /call me/i.test(text)
      );

  }


  /* =======================================================================
     SIMPLE INTENTS
     ======================================================================= */

  function isThanks(text) {

    var n =
      normalize(text);


    return [

      "thanks",
      "thank you",
      "thankyou",
      "thanks a lot",
      "thank you so much",
      "great thanks",
      "ok thanks",
      "okay thanks"

    ].includes(n);

  }


  function isGoodbye(text) {

    var n =
      normalize(text);


    return [

      "bye",
      "goodbye",
      "good bye",
      "see you",
      "see you later",
      "talk later"

    ].includes(n);

  }


  function isAffirmative(text) {

    var n =
      normalize(text);


    return [

      "yes",
      "yeah",
      "yep",
      "yup",
      "sure",
      "okay",
      "ok",
      "yes please",
      "sure please"

    ].includes(n);

  }


  function isNegative(text) {

    var n =
      normalize(text);


    return [

      "no",
      "nah",
      "no thanks",
      "not now",
      "never mind",
      "nevermind"

    ].includes(n);

  }


  /* =======================================================================
     CONTEXT DETECTION
     ======================================================================= */

  function detectTool(text) {

    var n =
      normalize(text);


    if (
      /\btool\s*(1|one)\b/.test(n) ||
      n.includes("marksheet vs tr") ||
      n.includes("marksheet verification") ||
      n.includes("gradesheet verification") ||
      n.includes("allinone") ||
      n.includes("all in one")
    ) {

      return "tool1";

    }


    if (
      /\btool\s*(2|two)\b/.test(n) ||
      n.includes("white vs original") ||
      n.includes("white original") ||
      n.includes("sealed original")
    ) {

      return "tool2";

    }


    return null;

  }


  function detectTopic(text) {

    var tool =
      detectTool(text);


    if (tool) {

      return tool;

    }


    var match =
      findBestKnowledge(text);


    if (
      match.item &&
      match.score >= 8
    ) {

      return match.item.topic;

    }


    return null;

  }


  function hasFollowUpReference(text) {

    var n =
      normalize(text);


    return (

      /\bit\b/.test(n) ||

      /\bthat\b/.test(n) ||

      /\bthis\b/.test(n) ||

      /\bthe tool\b/.test(n) ||

      /\bthat tool\b/.test(n) ||

      /\bthis tool\b/.test(n) ||

      /\bit work\b/.test(n) ||

      /\bhow do i use it\b/.test(n) ||

      /\bhow does it work\b/.test(n)

    );

  }


  /* =======================================================================
     CONTEXTUAL ANSWERING
     ======================================================================= */

  function contextualAnswer(text) {

    var n =
      normalize(text);


    /*
      If the user says:
      "what about tool 1?"
    */

    var tool =
      detectTool(text);


    if (tool === "tool1") {

      var item1 =
        KNOWLEDGE.find(
          function (x) {
            return x.id === "tool1";
          }
        );


      return item1;

    }


    if (tool === "tool2") {

      var item2 =
        KNOWLEDGE.find(
          function (x) {
            return x.id === "tool2";
          }
        );


      return item2;

    }


    /*
      Follow-up "it / that / this tool"
      uses previous tool context.
    */

    if (
      hasFollowUpReference(text)
    ) {

      if (
        memory.lastTool === "tool1"
      ) {

        if (
          /\bhow\b/.test(n) ||
          /\buse\b/.test(n) ||
          /\bwork\b/.test(n) ||
          /\bdo\b/.test(n)
        ) {

          return KNOWLEDGE.find(
            function (x) {
              return x.id === "tool1";
            }
          );

        }

      }


      if (
        memory.lastTool === "tool2"
      ) {

        if (
          /\bhow\b/.test(n) ||
          /\buse\b/.test(n) ||
          /\bwork\b/.test(n) ||
          /\bdo\b/.test(n)
        ) {

          return KNOWLEDGE.find(
            function (x) {
              return x.id === "tool2";
            }
          );

        }

      }


      /*
        Previous topic.
      */

      if (memory.lastTopic) {

        var contextual =
          KNOWLEDGE.find(
            function (x) {

              return (
                x.topic ===
                memory.lastTopic
              );

            }
          );


        if (contextual) {

          return contextual;

        }

      }

    }


    return null;

  }


  /* =======================================================================
     DYNAMIC RESPONSE PERSONALIZATION
     ======================================================================= */

  function personalize(text) {

    if (!memory.name) {

      return text;

    }


    /*
      Only personalize short conversational responses.
    */

    return text;

  }


  function getFollowUpSuggestions(item) {

    if (
      item &&
      item.suggestions &&
      item.suggestions.length
    ) {

      return item.suggestions
        .slice(0, 3)
        .map(function (text) {

          return {

            label: text,

            value: text

          };

        });

    }


    return [

      {
        label: "What does this website do?",

        value: "What does this website do?"

      },

      {
        label: "What tools are available?",

        value: "What tools are available?"

      },

      {
        label: "How does Tool 1 work?",

        value: "How does Tool 1 work?"

      }

    ];

  }


  /* =======================================================================
     URL HANDLING
     ======================================================================= */

  function resolveUrl(url) {

    if (!url) {

      return "#";

    }


    if (
      url.indexOf("PORTAL") === 0
    ) {

      return (
        CFG.portalUrl +
        url.slice(6)
      );

    }


    if (
      url === "TOOL1"
    ) {

      return CFG.tool1Url;

    }


    if (
      url === "TOOL2"
    ) {

      return CFG.tool2Url;

    }


    return url;

  }


  function openLink(url) {

    var resolved =
      resolveUrl(url);


    if (
      resolved.charAt(0) === "#"
    ) {

      var element =
        document.querySelector(
          resolved
        );


      if (
        element &&
        element.scrollIntoView
      ) {

        element.scrollIntoView({

          behavior: "smooth",

          block: "start"

        });


        return;

      }

    }


    window.open(
      resolved,
      "_blank",
      "noopener,noreferrer"
    );

  }


  /* =======================================================================
     MIRAGE — one companion, three personalities merged
     ======================================================================= */

  var MIRAGE = {

    name: 'Mirage',

    label: 'a friendly green robot',

    intro: 'Hey, I\u2019m Mirage. \uD83C\uDF31 I look after this site and I know the '
      + 'Verification Suite inside out. Ask me anything \u2014 or ask me to dance.',

    hello: [
      'Oh, hello there! \uD83C\uDF31',
      'There you are, stargazer. \u2726',
      'Hey! You look fun. \uD83D\uDC3E'
    ],

    back: [
      'There you are! I\u2019m back. \uD83C\uDF31',
      'Back in orbit. \u2726 What do you need?',
      'You rang? \uD83D\uDC3E'
    ],

    nap: [
      'Just resting my pixels\u2026',
      'Entering low-power orbit\u2026',
      'Five more minutes. Or fifty\u2026'
    ],

    away: [
      'Taking a little stroll. Call me when you need me.',
      'Exploring the far side of this screen. Back when you call.',
      'Gone looking for snacks. You know where to find me.'
    ],

    idle: {

      look: [
        'Just watching the clouds drift by.',
        'Counting imaginary constellations.',
        'Was that a snack? No? Investigating anyway.'
      ],

      stretch: [
        'A little stretch feels nice.',
        'Stretching before my next orbit.',
        'Big stretch. Very important business.'
      ],

      dance: [
        'Oh! A tiny dance break.',
        'A little moonwalk, perhaps?',
        'Nobody\u2019s watching, right? Dance time!'
      ]

    },

    replies: {

      dance: [
        'A small dance, just for you. Here goes\u2026 \u266B',
        'Switching to zero-gravity disco. \u266B',
        'Warning: these moves are completely unlicensed. \u266B'
      ],

      joke: [
        'Why did the robot take a holiday? It needed to recharge its batteries.',
        'How do you organize a space party? You planet.',
        'What do cats eat for breakfast? Mice Krispies.',
        'I told my computer I needed a break. It said: no problem, I\u2019ll go to sleep.'
      ],

      feeling: [
        'A little green, a little curious, and happy you\u2019re here.',
        'Head in the stars, feet approximately on the ground.',
        'Equal parts mischief and snack anticipation.'
      ]

    }

  };

  var lastPicks = {};

  function pick(list, key) {
    if (list.length === 1) return list[0];
    var index = Math.floor(Math.random() * list.length);
    if (key && lastPicks[key] === index) index = (index + 1) % list.length;
    if (key) lastPicks[key] = index;
    return list[index];
  }


  /* =======================================================================
     DOM REFERENCES  (D is the document or the widget's shadow root)
     ======================================================================= */

  function $(id) {
    return D.getElementById(id);
  }

  function all(selector) {
    return Array.prototype.slice.call(D.querySelectorAll(selector));
  }

  var bodyEl = $('messages');
  var inputEl = $('message-input');
  var formEl = $('chat-form');
  var sendBtn = D.querySelector('.send');
  var clearBtn = $('clear');
  var mrgMicBtn = $('mic');
  var mrgVoiceToggleBtn = $('voice-toggle');
  var mrgVoiceStatusEl = $('voice-status');

  var win = D.querySelector('.chat') || D.querySelector('.mrg-panel');
  var robot = $('robot');
  var actor = $('actor');
  var speech = $('speech');
  var mood = $('mood');
  var scene = $('scene');
  var caption = $('caption');
  var settingsEl = $('settings');


  /* =======================================================================
     PREFERENCES
     ======================================================================= */

  var preferences = {
    idle: true,
    pace: 'normal',
    wander: true,
    motion: true,
    background: 'meadow'
  };

  try {
    var savedPrefs = JSON.parse(localStorage.getItem('mirage.preferences') || '{}');
    ['idle', 'wander', 'motion'].forEach(function (key) {
      if (typeof savedPrefs[key] === 'boolean') preferences[key] = savedPrefs[key];
    });
    if (['normal', 'demo'].indexOf(savedPrefs.pace) > -1) preferences.pace = savedPrefs.pace;
    if (['meadow', 'night', 'studio'].indexOf(savedPrefs.background) > -1) preferences.background = savedPrefs.background;
  } catch (e) { /* storage is optional */ }


  /* =======================================================================
     PET STATE
     ======================================================================= */

  var state = 'awake';
  var manualSleep = false;
  var maskOpen = false;
  var lastActive = performance.now();
  var nextIdle = 0;
  var lastIdle = -1;
  var actionTimer = null;
  var leaveTimer = null;
  var pointerTime = 0;
  var panelOpen = !IS_WIDGET;

  function pace() {
    return preferences.pace === 'demo'
      ? { play: 4000, nap: 9000, leave: 16000 }
      : { play: 20000, nap: 60000, leave: 100000 };
  }

  function settingsIsOpen() {
    if (!settingsEl) return false;
    return IS_WIDGET ? settingsEl.classList.contains('open') : !!settingsEl.open;
  }

  function openSettings() {
    if (!settingsEl) return;
    if (IS_WIDGET) {
      settingsEl.classList.add('open');
    } else if (typeof settingsEl.showModal === 'function') {
      settingsEl.showModal();
    } else {
      settingsEl.setAttribute('open', '');
    }
  }

  function closeSettings() {
    if (!settingsEl) return;
    if (IS_WIDGET) {
      settingsEl.classList.remove('open');
      afterSettingsClose();
    } else if (typeof settingsEl.close === 'function') {
      settingsEl.close();
    } else {
      settingsEl.removeAttribute('open');
      afterSettingsClose();
    }
  }

  function afterSettingsClose() {
    resetClock();
    if (!manualSleep) wake();
    var opener = $('settings-open');
    if (opener) opener.focus();
  }

  function paused() {
    return document.hidden || settingsIsOpen() || !panelOpen;
  }

  function savePreferences() {
    try {
      localStorage.setItem('mirage.preferences', JSON.stringify(preferences));
    } catch (e) {
      var note = $('settings-note');
      if (note) {
        note.textContent = 'Preferences work for this visit. This browser does not allow saving them here.';
      }
    }
  }

  function setBackground(value) {
    if (!scene) return;
    scene.dataset.scene = value;
    preferences.background = value;
    all('[data-background]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.background === value));
    });
  }

  function applyPreferences() {
    SCOPE.dataset.motion = preferences.motion ? 'on' : 'off';

    var idleSetting = $('idle-setting');
    var wanderSetting = $('wander-setting');
    var motionSetting = $('motion-setting');
    var paceSetting = $('pace-setting');
    var paceDescription = $('pace-description');
    var idleNote = $('idle-note');

    if (idleSetting) idleSetting.checked = preferences.idle;
    if (wanderSetting) {
      wanderSetting.checked = preferences.wander;
      wanderSetting.disabled = !preferences.idle;
    }
    if (motionSetting) motionSetting.checked = preferences.motion;
    if (paceSetting) {
      paceSetting.value = preferences.pace;
      paceSetting.disabled = !preferences.idle;
    }
    if (paceDescription) {
      paceDescription.textContent = preferences.pace === 'demo'
        ? 'Play at 4s, nap at 9s, leave at 16s.'
        : 'Play at 20s, nap at 60s, leave at 100s.';
    }
    if (idleNote) {
      idleNote.textContent = !preferences.idle
        ? 'Idle activities paused.'
        : preferences.pace === 'demo'
          ? 'Quick demo \u00b7 4s / 9s / 16s'
          : 'Idle moments, little surprises.';
    }

    setBackground(preferences.background);
  }

  function clearTimers() {
    clearTimeout(actionTimer);
    clearTimeout(leaveTimer);
    actionTimer = null;
    leaveTimer = null;
  }

  function updateMood() {
    var labels = {
      awake: maskOpen ? '\u25cf Mask open' : '\u25cf Ready to help',
      wave: '\u2197 Saying hello',
      dance: '\u266b Dance break',
      stretch: '\u279f Big stretch',
      look: '\u2727 Thinking\u2026',
      sleep: '\u263e Sleeping \u00b7 Zzz',
      leaving: '\u2197 Taking a stroll',
      away: '\u25cb Out exploring'
    };

    if (mood) mood.textContent = labels[state];

    var napBtn = $('nap');
    if (napBtn) {
      napBtn.textContent = state === 'sleep' ? 'Wake up \u2197' : 'Take a nap \u263e';
      napBtn.dataset.command = state === 'sleep' ? 'wake up' : 'sleep';
    }

    if (caption) {
      caption.textContent = state === 'sleep'
        ? 'Shh\u2026 recharging my imagination.'
        : state === 'away'
          ? 'Move your cursor or call me back.'
          : 'Move your cursor. You have my attention.';
    }

    if (robot) {
      robot.setAttribute('aria-label', MIRAGE.name + ', ' + MIRAGE.label + (state === 'sleep' ? ', sleeping' : ''));
    }
  }

  function renderState() {
    if (robot) {
      robot.className = 'robot'
        + (maskOpen ? ' open' : '')
        + (['wave', 'dance', 'stretch', 'look', 'sleep'].indexOf(state) > -1 ? ' ' + state : '');
    }
    if (actor) {
      actor.className = 'actor' + (['leaving', 'away'].indexOf(state) > -1 ? ' ' + state : '');
      actor.setAttribute('aria-hidden', String(state === 'away'));
    }
    if (scene) scene.classList.toggle('is-away', state === 'away');
    updateMood();
  }

  function resetClock() {
    lastActive = performance.now();
    nextIdle = lastActive + pace().play;
  }

  function wake(showGreeting) {
    clearTimers();
    state = 'awake';
    manualSleep = false;
    resetClock();
    renderState();
    if (showGreeting) say(pick(MIRAGE.back, 'back'));
  }

  function activity() {
    if (paused()) return;
    if (!manualSleep && ['sleep', 'leaving', 'away'].indexOf(state) > -1) wake(true);
    else resetClock();
  }

  function animate(action) {
    clearTimers();
    manualSleep = action === 'sleep';
    if (action === 'open') maskOpen = true;
    if (action === 'close') maskOpen = false;
    state = ['wave', 'dance', 'stretch', 'look', 'sleep'].indexOf(action) > -1 ? action : 'awake';
    resetClock();
    renderState();
    if (['wave', 'dance', 'stretch', 'look'].indexOf(state) > -1) {
      actionTimer = setTimeout(function () {
        state = 'awake';
        renderState();
      }, 2800);
    }
  }

  function goAway() {
    clearTimers();
    state = 'leaving';
    say(pick(MIRAGE.away, 'away'));
    renderState();
    leaveTimer = setTimeout(function () {
      state = 'away';
      renderState();
    }, 1800);
  }

  function tick(now) {
    now = now || performance.now();

    if (paused() || !preferences.idle || manualSleep) return;
    if (['away', 'leaving'].indexOf(state) > -1) return;

    var elapsed = now - lastActive;
    var timing = pace();

    if (elapsed >= timing.leave && preferences.wander) {
      goAway();
      return;
    }

    if (elapsed >= timing.nap) {
      if (state !== 'sleep') {
        clearTimers();
        state = 'sleep';
        say(pick(MIRAGE.nap, 'nap'));
        if (robot) {
          robot.style.setProperty('--look-x', '0px');
          robot.style.setProperty('--look-y', '0px');
        }
        renderState();
      }
      return;
    }

    if (now >= nextIdle && state === 'awake') {
      var choice = Math.floor(Math.random() * 3);
      if (choice === lastIdle) choice = (choice + 1) % 3;
      lastIdle = choice;

      var kind = ['look', 'stretch', 'dance'][choice];
      state = kind;
      say(pick(MIRAGE.idle[kind], 'idle-' + kind));
      renderState();

      nextIdle = now + timing.play;
      actionTimer = setTimeout(function () {
        state = 'awake';
        renderState();
      }, 3000);
    }
  }

  function lookAt(x, y) {
    if (!robot || !panelOpen) return;
    if (['sleep', 'leaving', 'away'].indexOf(state) > -1) return;
    var rect = robot.getBoundingClientRect();
    if (!rect.width) return;
    robot.style.setProperty('--look-x', Math.max(-11, Math.min(11, (x - rect.left - rect.width / 2) / 24)) + 'px');
    robot.style.setProperty('--look-y', Math.max(-6, Math.min(6, (y - rect.top - rect.height / 2) / 28)) + 'px');
  }

  var measure = null;
  try {
    measure = document.createElement('canvas').getContext('2d');
  } catch (e) {
    measure = null;
  }

  function followTyping() {
    if (!measure || !inputEl) return;
    try {
      var rect = inputEl.getBoundingClientRect();
      measure.font = getComputedStyle(inputEl).font;
      var caret = inputEl.value.slice(0, inputEl.selectionStart === null ? inputEl.value.length : inputEl.selectionStart);
      var width = measure.measureText(caret).width;
      lookAt(rect.left + Math.max(0, Math.min(rect.width, width - inputEl.scrollLeft)), rect.top + rect.height / 2);
      if (state !== 'sleep' && caption) caption.textContent = 'I\u2019m watching your words come to life.';
    } catch (e) { /* measuring is cosmetic */ }
  }


  /* =======================================================================
     SPEECH BUBBLE
     ======================================================================= */

  function say(text) {
    if (!speech) return;
    var clean = String(text || '').split('\n')[0].trim();
    if (!clean) clean = String(text || '').trim();
    speech.textContent = clean.length > 115 ? clean.slice(0, 112) + '\u2026' : clean;
  }


  /* =======================================================================
     MESSAGE RENDERING
     ======================================================================= */

  function scrollBottom() {
    requestAnimationFrame(function () {
      bodyEl.scrollTop = bodyEl.scrollHeight;
    });
  }

  function dropChips() {
    Array.prototype.slice.call(bodyEl.querySelectorAll('.chips')).forEach(function (old) {
      old.remove();
    });
  }

  function addUserMessage(text) {
    rememberMessage('user', text);
    dropChips();

    var row = document.createElement('div');
    row.className = 'message user';

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;

    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollBottom();
  }

  function addBotMessage(text, linkObj, showTools) {
    rememberMessage('bot', text);

    var row = document.createElement('div');
    row.className = 'message bot';

    var avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = 'm.';
    avatar.setAttribute('aria-hidden', 'true');
    row.appendChild(avatar);

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = personalize(text);

    if (linkObj && linkObj.url) {
      var link = document.createElement('button');
      link.className = 'link-btn';
      link.type = 'button';
      link.textContent = linkObj.label + '  \u2197';
      link.addEventListener('click', function () {
        openLink(linkObj.url);
      });
      bubble.appendChild(document.createElement('br'));
      bubble.appendChild(link);
    }

    if (showTools !== false) {
      var tools = document.createElement('div');
      tools.className = 'bot-tools';

      var copy = document.createElement('button');
      copy.className = 'mrg3-mini';
      copy.type = 'button';
      copy.textContent = 'Copy';
      copy.addEventListener('click', function () {
        copyText(text);
        copy.textContent = 'Copied \u2713';
        setTimeout(function () {
          copy.textContent = 'Copy';
        }, 1200);
      });
      tools.appendChild(copy);

      mrgAddSpeakButton(tools, text);
      bubble.appendChild(tools);
    }

    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollBottom();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch (e) {}
    textarea.remove();
  }


  /* =======================================================================
     TYPING
     ======================================================================= */

  var typingRow = null;
  var pendingAction = null;

  function showTyping() {
    hideTyping();

    typingRow = document.createElement('div');
    typingRow.className = 'message bot';
    typingRow.innerHTML =
      '<span class="avatar" aria-hidden="true">m.</span>'
      + '<div class="typing"><span></span><span></span><span></span></div>';

    bodyEl.appendChild(typingRow);
    scrollBottom();

    if (!manualSleep && ['leaving', 'away', 'sleep'].indexOf(state) === -1) {
      clearTimers();
      state = 'look';
      renderState();
    }
  }

  function hideTyping() {
    if (typingRow) {
      typingRow.remove();
      typingRow = null;
    }
    if (state === 'look') {
      state = 'awake';
      renderState();
    }
  }

  function reply(text, link, suggestions) {
    showTyping();

    var delay = Math.min(900, Math.max(380, 280 + text.length * 1.2));

    setTimeout(function () {
      hideTyping();
      addBotMessage(text, link);
      say(text);

      if (pendingAction) {
        animate(pendingAction);
        pendingAction = null;
      }

      if (mrgVoiceEnabled) {
        mrgSpeakText(text);
      }

      if (suggestions && suggestions.length) {
        setTimeout(function () {
          addSuggestions(suggestions);
        }, 80);
      }
    }, delay);
  }

  function addSuggestions(suggestions) {
    var wrap = document.createElement('div');
    wrap.className = 'chips';

    suggestions.forEach(function (option) {
      var button = document.createElement('button');
      button.className = 'chip';
      button.type = 'button';
      button.textContent = option.label;
      button.addEventListener('click', function () {
        wrap.remove();
        activity();
        handleMessage(option.value);
      });
      wrap.appendChild(button);
    });

    bodyEl.appendChild(wrap);
    scrollBottom();
  }


  /* =======================================================================
     COMPANION TRICKS  (checked before the knowledge engine)
     ======================================================================= */

  var petCommands = [

    {
      id: 'help',
      phrases: ['help', 'what can you do', 'commands', 'what can u do', 'what do you do'],
      reply: function () {
        return 'Two things, really. \uD83D\uDC4B\n\n'
          + 'Ask me about the site \u2014 what it does, the tools, Marksheet vs TR, '
          + 'White vs Original, SGPA, failed candidates, withheld students, PDF errors, reports, privacy.\n\n'
          + 'Or ask me for a trick \u2014 wave, dance, stretch, sleep, wake up, open mask, '
          + 'close mask, tell me a joke, how are you, who are you, what time is it.';
      },
      suggestions: [
        { label: 'What does this website do?', value: 'What does this website do?' },
        { label: 'What tools are available?', value: 'What tools are available?' },
        { label: 'Little dance \u266b', value: 'dance' }
      ]
    },

    {
      id: 'wave',
      phrases: ['wave', 'wave hello', 'say hi'],
      reply: 'A little wave, just for you! \uD83D\uDC4B',
      action: 'wave'
    },

    { id: 'dance', phrases: ['dance', 'do a dance', 'little dance'], action: 'dance' },

    {
      id: 'stretch',
      phrases: ['stretch', 'do a stretch'],
      reply: 'A big stretch and a fresh start.',
      action: 'stretch'
    },

    {
      id: 'sleep',
      phrases: ['sleep', 'go to sleep', 'take a nap', 'nap'],
      reply: function () {
        return pick(MIRAGE.nap, 'nap') + ' Say \u201cwake up\u201d when you need me.';
      },
      action: 'sleep'
    },

    {
      id: 'wake',
      phrases: ['wake up', 'wake', 'come back'],
      reply: 'Back and ready. What do you need?',
      action: 'wake'
    },

    {
      id: 'open',
      phrases: ['open mask', 'open the mask', 'mask up'],
      reply: 'Mask open! This is an on-screen animation only.',
      action: 'open'
    },

    {
      id: 'close',
      phrases: ['close mask', 'close the mask', 'mask down'],
      reply: 'Mask closed. Ready when you are.',
      action: 'close'
    },

    { id: 'joke', phrases: ['tell me a joke', 'joke', 'make me laugh'], action: 'dance' },

    { id: 'feeling', phrases: ['how are you', 'how are you doing', 'how r u'] },

    {
      id: 'identity',
      phrases: ['what is your name', 'whats your name', 'who are you', 'your name'],
      reply: function () {
        return 'I\u2019m ' + MIRAGE.name + ', ' + MIRAGE.label + '. '
          + 'I answer questions about the Verification Suite, entirely offline \u2014 '
          + 'nothing you type ever leaves this browser.';
      }
    },

    {
      id: 'time',
      phrases: ['what time is it', 'time', 'what is the time'],
      reply: function () {
        return 'It\u2019s ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          + ' on your device.';
      }
    }

  ];

  function petNormalize(value) {
    var clean = String(value || '')
      .toLowerCase()
      .replace(/[\u2019']/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    clean = clean.replace(/^please\s+/, '').replace(/\s+please$/, '');
    clean = clean.replace(/^(?:hey |hi )?(?:mirage|milo|nova|pip)\s+/, '').replace(/\s+(?:mirage|milo|nova|pip)$/, '');
    clean = clean.replace(/^please\s+/, '');

    return clean.trim();
  }

  function runPetCommand(text) {
    var clean = petNormalize(text);

    var command = null;
    for (var i = 0; i < petCommands.length; i++) {
      if (petCommands[i].phrases.indexOf(clean) > -1) {
        command = petCommands[i];
        break;
      }
    }

    if (!command) return false;

    var replyText = MIRAGE.replies[command.id]
      ? pick(MIRAGE.replies[command.id], command.id)
      : null;

    if (!replyText) {
      replyText = typeof command.reply === 'function' ? command.reply() : command.reply;
    }

    if (!replyText) replyText = 'Done. \u2728';

    if (command.action) pendingAction = command.action;

    reply(replyText, null, command.suggestions || null);

    return true;
  }

  function petReactTo(text) {
    if (manualSleep) return;
    if (isGreeting(text) || isGreetingWithName(text) || isGoodbye(text)) {
      pendingAction = 'wave';
    } else if (isThanks(text)) {
      pendingAction = 'dance';
    }
  }


  /* =======================================================================
     INPUT HELPERS
     ======================================================================= */

  function syncSend() {
    if (sendBtn) sendBtn.disabled = !inputEl.value.trim();
  }

  function submitInput() {
    var text = inputEl.value;

    if (!text.trim()) return;

    inputEl.value = '';
    syncSend();
    activity();
    handleMessage(text);
  }


  /* =======================================================================
     ANSWER LOGIC
     ======================================================================= */

  function answer(text) {

    /*
      1. Knowledge matching.
    */

    var match =
      findBestKnowledge(text);


    /*
      2. A clearly self-contained question wins outright, before any
         pronoun-based follow-up context is applied. Real follow-ups
         ("how does it work", "how do i use it") score 0 here and fall
         straight through to the contextual pass below.
    */

    if (
      match.item &&
      match.score >= 40
    ) {

      return match.item;

    }


    /*
      3. Contextual answer for follow-ups.
    */

    var contextual =
      contextualAnswer(text);


    if (contextual) {

      return contextual;

    }


    /*
      Strong match.
    */

    if (
      match.item &&
      match.score >= 8
    ) {

      return match.item;

    }


    /*
      Moderate match with clear lead.
    */

    if (
      match.item &&
      match.score >= 5 &&
      match.score >
        match.secondScore + 2
    ) {

      return match.item;

    }


    return null;

  }


  /* =======================================================================
     FALLBACK
     ======================================================================= */

  function fallback() {

    var namePart =
      memory.name
        ? ", " + memory.name
        : "";


    var text =
      "I'm not completely sure what you mean" +
      namePart +
      ". 🤔\n\n" +

      "I can help with the Verification Suite, including:\n\n" +

      "• What this website does\n" +
      "• Available verification tools\n" +
      "• Marksheet vs TR Verification\n" +
      "• White vs Original Verification\n" +
      "• SGPA & Percentage\n" +
      "• Failed Candidates\n" +
      "• Withheld Students\n" +
      "• TR information\n" +
      "• PDF errors\n" +
      "• Reports\n" +
      "• Privacy and security";


    reply(
      text,
      null,
      [

        {
          label:
            "What does this website do?",

          value:
            "What does this website do?"

        },

        {
          label:
            "What tools are available?",

          value:
            "What tools are available?"

        },

        {
          label:
            "How does Tool 1 work?",

          value:
            "How does Tool 1 work?"

        }

      ]

    );

  }


  /* =======================================================================
     MAIN MESSAGE HANDLER
     ======================================================================= */

  function handleMessage(
    rawText
  ) {

    var text =
      String(rawText || "")
        .trim();


    if (!text) {

      return;

    }


    addUserMessage(
      text
    );

    /*
      ---------------------------------------------------------------
      COMPANION TRICKS (wave, dance, nap, joke, time...)
      ---------------------------------------------------------------
    */

    if (runPetCommand(text)) {

      return;

    }


    petReactTo(text);



    /*
      ---------------------------------------------------------------
      NAME + GREETING
      ---------------------------------------------------------------
    */

    var extractedName =
      extractName(text);


    if (
      extractedName
    ) {

      memory.name =
        extractedName;


      saveMemory();


      memory.lastTopic =
        null;


      var greeting =
        getTimeGreeting();


      reply(

        greeting +
        " " +
        extractedName +
        "! 👋\n\n" +

        "Nice to meet you. " +

        "What doubt do you have today?",

        null,

        [

          {
            label:
              "What does this website do?",

            value:
              "What does this website do?"

          },

          {
            label:
              "What tools are available?",

            value:
              "What tools are available?"

          },

          {
            label:
              "How does Tool 1 work?",

            value:
              "How does Tool 1 work?"

          }

        ]

      );


      return;

    }


    /*
      ---------------------------------------------------------------
      GREETING ONLY
      ---------------------------------------------------------------
    */

    if (
      isGreeting(text)
    ) {

      var greetingText =
        getTimeGreeting();


      if (
        memory.name
      ) {

        reply(

          greetingText +
          " " +
          memory.name +
          "! 👋\n\n" +

          "What doubt do you have today?",

          null,

          [

            {
              label:
                "What does this website do?",

              value:
                "What does this website do?"

            },

            {
              label:
                "What tools are available?",

              value:
                "What tools are available?"

            },

            {
              label:
                "How does Tool 1 work?",

              value:
                "How does Tool 1 work?"

            }

          ]

        );

      }

      else {

        reply(

          greetingText +
          "! 👋\n\n" +

          "I'm " +
          CFG.botName +
          ", your Verification Suite assistant.\n\n" +

          "You can tell me your name, or directly ask me something about the website.",

          null,

          [

            {
              label:
                "Tell me what this website does",

              value:
                "What does this website do?"

            },

            {
              label:
                "Show me the tools",

              value:
                "What tools are available?"

            }

          ]

        );

      }


      return;

    }


    /*
      ---------------------------------------------------------------
      THANKS
      ---------------------------------------------------------------
    */

    if (
      isThanks(text)
    ) {

      reply(

        memory.name
          ? "You're welcome, " +
            memory.name +
            "! 😊"
          : "You're welcome! 😊",

        null,

        [

          {
            label:
              "Ask another question",

            value:
              "What tools are available?"

          }

        ]

      );


      return;

    }


    /*
      ---------------------------------------------------------------
      GOODBYE
      ---------------------------------------------------------------
    */

    if (
      isGoodbye(text)
    ) {

      reply(

        memory.name
          ? "Goodbye, " +
            memory.name +
            "! 👋 Have a great day."
          : "Goodbye! 👋 Have a great day."

      );


      return;

    }


    /*
      ---------------------------------------------------------------
      NEGATIVE
      ---------------------------------------------------------------
    */

    if (
      isNegative(text)
    ) {

      reply(

        "No problem. 👍\n\n" +
        "Whenever you're ready, ask me anything about the Verification Suite."

      );


      return;

    }


    /*
      ---------------------------------------------------------------
      AFFIRMATIVE
      ---------------------------------------------------------------
    */

    if (
      isAffirmative(text) &&
      memory.lastTopic
    ) {

      var previous =
        KNOWLEDGE.find(
          function (item) {

            return (
              item.topic ===
              memory.lastTopic
            );

          }
        );


      if (previous) {

        reply(

          "Sure. Here's the relevant information:\n\n" +
          previous.answer,

          previous.link,

          getFollowUpSuggestions(
            previous
          )

        );


        return;

      }

    }


    /*
      ---------------------------------------------------------------
      NORMAL KNOWLEDGE ANSWER
      ---------------------------------------------------------------
    */

    var result =
      answer(text);


    if (
      result
    ) {

      memory.lastTopic =
        result.topic;


      memory.lastIntent =
        result.id;


      var tool =
        detectTool(text);


      if (tool) {

        memory.lastTool =
          tool;

      }

      else if (
        result.id === "tool1"
      ) {

        memory.lastTool =
          "tool1";

      }

      else if (
        result.id === "tool2"
      ) {

        memory.lastTool =
          "tool2";

      }


      reply(

        result.answer,

        result.link,

        getFollowUpSuggestions(
          result
        )

      );


      return;

    }


    /*
      ---------------------------------------------------------------
      FALLBACK
      ---------------------------------------------------------------
    */

    fallback();

  }


  /* =======================================================================
     CLEAR CONVERSATION
     ======================================================================= */

  function clearConversation() {

    mrgStopSpeaking();

    mrgStopListening();


    memory.history = [];

    memory.lastTopic =
      null;

    memory.lastIntent =
      null;

    memory.lastTool =
      null;


    bodyEl.innerHTML = "";


    reply(

      memory.name
        ? "Conversation cleared. 👋\n\n" +
          "What would you like to know, " +
          memory.name +
          "?"
        : "Conversation cleared. 👋\n\nWhat would you like to know?",

      null,

      [

        {
          label:
            "What does this website do?",

          value:
            "What does this website do?"

        },

        {
          label:
            "What tools are available?",

          value:
            "What tools are available?"

        }

      ]

    );

  }



  /* =======================================================================
     VOICE FEATURES — Speech-to-Text + Text-to-Speech (ADDED)
     -----------------------------------------------------------------------
     This entire block is additive. It does not touch the existing chatbot
     logic above. Voice input is funneled into the existing handleMessage()
     function, and voice output simply reads the existing bot response text
     aloud. Nothing here duplicates or replaces the chatbot engine.
     ======================================================================= */

  var mrgVoiceEnabled =
    false;


  var mrgVoiceRecognition =
    null;


  var mrgVoiceIsListening =
    false;


  var mrgVoiceCurrentUtterance =
    null;


  var mrgVoiceSpeechRecognitionCtor =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null;


  var mrgVoiceSpeechSupported =
    !!mrgVoiceSpeechRecognitionCtor;


  var mrgVoiceSynthSupported =
    !!(
      window.speechSynthesis &&
      window.SpeechSynthesisUtterance
    );


  var mrgVoiceEnabledStorageKey =
    "mirage_voice_enabled";


  /* -----------------------------------------------------------------------
     STATUS HELPER
     ----------------------------------------------------------------------- */

  function mrgSetVoiceStatus(
    message,
    isError
  ) {

    if (!mrgVoiceStatusEl) {

      return;

    }


    mrgVoiceStatusEl.textContent =
      message || "";


    mrgVoiceStatusEl.classList.toggle(
      "mrg-error",
      !!isError
    );

  }


  /* -----------------------------------------------------------------------
     TEXT-TO-SPEECH
     ----------------------------------------------------------------------- */

  function mrgCleanTextForSpeech(text) {

    var clean =
      String(text || "");


    /*
      Strip any HTML tags, just in case.
    */

    clean =
      clean.replace(
        /<[^>]*>/g,
        " "
      );


    /*
      Drop raw URLs — not useful when spoken aloud.
    */

    clean =
      clean.replace(
        /(https?:\/\/[^\s]+)/gi,
        ""
      );


    /*
      Remove common markdown symbols.
    */

    clean =
      clean.replace(
        /[*_`~#>]+/g,
        ""
      );


    /*
      Replace numbered list circles used in the knowledge base
      (①②③④) with plain words so they sound natural.
    */

    clean =
      clean
        .replace(/①/g, "One,")
        .replace(/②/g, "Two,")
        .replace(/③/g, "Three,")
        .replace(/④/g, "Four,");


    /*
      Strip most emoji / decorative symbols while leaving normal
      punctuation and text untouched.
    */

    clean =
      clean.replace(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
        ""
      );


    /*
      Collapse extra whitespace/newlines left behind.
    */

    clean =
      clean
        .replace(/\n+/g, ". ")
        .replace(/\s{2,}/g, " ")
        .trim();


    return clean;

  }


  function mrgStopSpeaking() {

    if (!mrgVoiceSynthSupported) {

      return;

    }


    try {

      window.speechSynthesis.cancel();

    }

    catch (e) {

      /* Ignore */

    }


    mrgVoiceCurrentUtterance =
      null;


    var speakingButtons =
      win.querySelectorAll(
        ".mrg3-speak-btn.mrg-speaking"
      );


    speakingButtons.forEach(
      function (btn) {

        btn.textContent =
          "🔊 Speak";


        btn.classList.remove(
          "mrg-speaking"
        );

      }
    );

  }


  function mrgSpeakText(
    text,
    buttonEl
  ) {

    if (!mrgVoiceSynthSupported) {

      return;

    }


    /*
      Never let two responses speak over each other.
    */

    mrgStopSpeaking();


    var cleaned =
      mrgCleanTextForSpeech(text);


    if (!cleaned) {

      return;

    }


    try {

      var utterance =
        new SpeechSynthesisUtterance(
          cleaned
        );


      utterance.lang =
        "en-IN";


      utterance.rate =
        0.97;


      utterance.onend =
        function () {

          if (buttonEl) {

            buttonEl.textContent =
              "🔊 Speak";


            buttonEl.classList.remove(
              "mrg-speaking"
            );

          }


          mrgVoiceCurrentUtterance =
            null;

        };


      utterance.onerror =
        function () {

          if (buttonEl) {

            buttonEl.textContent =
              "🔊 Speak";


            buttonEl.classList.remove(
              "mrg-speaking"
            );

          }


          mrgVoiceCurrentUtterance =
            null;

        };


      mrgVoiceCurrentUtterance =
        utterance;


      if (buttonEl) {

        buttonEl.textContent =
          "⏹ Stop";


        buttonEl.classList.add(
          "mrg-speaking"
        );

      }


      window.speechSynthesis.speak(
        utterance
      );

    }

    catch (e) {

      /* Fail silently — never break the chatbot. */

    }

  }


  function mrgAddSpeakButton(
    toolsContainer,
    text
  ) {

    if (!mrgVoiceSynthSupported) {

      return;

    }


    var speakBtn =
      document.createElement(
        "button"
      );


    speakBtn.className =
      "mrg3-mini mrg3-speak-btn";


    speakBtn.type =
      "button";


    speakBtn.textContent =
      "🔊 Speak";


    speakBtn.setAttribute(
      "aria-label",
      "Speak this response"
    );


    speakBtn.addEventListener(
      "click",
      function () {

        var alreadySpeaking =
          speakBtn.classList.contains(
            "mrg-speaking"
          );


        mrgStopSpeaking();


        if (!alreadySpeaking) {

          mrgSpeakText(
            text,
            speakBtn
          );

        }

      }
    );


    toolsContainer.appendChild(
      speakBtn
    );

  }


  function mrgToggleVoice() {

    mrgVoiceEnabled =
      !mrgVoiceEnabled;


    try {

      localStorage.setItem(
        mrgVoiceEnabledStorageKey,
        mrgVoiceEnabled ? "true" : "false"
      );

    }

    catch (e) {

      /* Ignore storage errors */

    }


    if (!mrgVoiceEnabled) {

      mrgStopSpeaking();

    }


    mrgUpdateVoiceToggleUI();

  }


  function mrgUpdateVoiceToggleUI() {

    if (!mrgVoiceToggleBtn) {

      return;

    }


    mrgVoiceToggleBtn.classList.toggle(
      "mrg-voice-on",
      mrgVoiceEnabled
    );


    mrgVoiceToggleBtn.setAttribute(
      "aria-pressed",
      mrgVoiceEnabled ? "true" : "false"
    );


    mrgVoiceToggleBtn.title =
      mrgVoiceEnabled
        ? "Voice replies are on — click to turn off"
        : "Turn spoken responses on";


    mrgVoiceToggleBtn.setAttribute(
      "aria-label",
      mrgVoiceToggleBtn.title
    );

  }


  /* -----------------------------------------------------------------------
     SPEECH-TO-TEXT
     ----------------------------------------------------------------------- */

  function mrgStartListening() {

    if (
      !mrgVoiceSpeechSupported ||
      !mrgVoiceRecognition
    ) {

      mrgSetVoiceStatus(
        "Voice input isn't supported in this browser. You can still type your question.",
        true
      );


      return;

    }


    if (mrgVoiceIsListening) {

      mrgStopListening();


      return;

    }


    /*
      A fresh voice interaction should not overlap with the bot
      currently speaking.
    */

    mrgStopSpeaking();


    try {

      mrgVoiceRecognition.start();

    }

    catch (e) {

      /*
        start() throws if recognition is already active — treat this
        as a no-op rather than crashing the chatbot.
      */

    }

  }


  function mrgStopListening() {

    if (
      !mrgVoiceSpeechSupported ||
      !mrgVoiceRecognition
    ) {

      return;

    }


    try {

      mrgVoiceRecognition.stop();

    }

    catch (e) {

      /* Ignore */

    }

  }


  function mrgSetListeningUI(isListening) {

    mrgVoiceIsListening =
      isListening;


    if (!mrgMicBtn) {

      return;

    }


    mrgMicBtn.classList.toggle(
      "mrg-listening",
      isListening
    );


    mrgMicBtn.setAttribute(
      "aria-label",
      isListening
        ? "Stop listening"
        : "Speak your question"
    );


    mrgMicBtn.title =
      isListening
        ? "Stop listening"
        : "Speak your question";

  }


  function mrgHandleSpeechResult(event) {

    var transcript =
      "";


    for (
      var i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      if (
        event.results[i] &&
        event.results[i][0]
      ) {

        transcript +=
          event.results[i][0].transcript;

      }

    }


    transcript =
      transcript.trim();


    if (!transcript) {

      mrgSetVoiceStatus(
        "I didn't catch that. Please try again."
      );


      return;

    }


    mrgSetVoiceStatus(
      "Processing…"
    );


    /*
      Route the recognized speech through the exact same path as
      typed input — no separate voice answer logic.
    */

    inputEl.value =
      transcript;


    handleMessage(
      transcript
    );


    inputEl.value =
      "";


    mrgSetVoiceStatus(
      ""
    );

  }


  function mrgHandleSpeechError(event) {

    var message =
      "Something went wrong with voice input. You can still type your question.";


    if (
      event &&
      event.error === "not-allowed"
    ) {

      message =
        "Microphone access was denied. You can still type your question.";

    }

    else if (
      event &&
      event.error === "no-speech"
    ) {

      message =
        "I didn't hear anything. Please try again.";

    }

    else if (
      event &&
      event.error === "audio-capture"
    ) {

      message =
        "No microphone was found. You can still type your question.";

    }

    else if (
      event &&
      event.error === "network"
    ) {

      message =
        "Voice recognition network error. You can still type your question.";

    }


    mrgSetVoiceStatus(
      message,
      true
    );


    mrgSetListeningUI(
      false
    );

  }


  /* -----------------------------------------------------------------------
     INIT
     ----------------------------------------------------------------------- */

  function initVoiceFeatures() {

    /*
      Restore the user's saved voice preference (default OFF).
    */

    try {

      mrgVoiceEnabled =
        localStorage.getItem(
          mrgVoiceEnabledStorageKey
        ) === "true";

    }

    catch (e) {

      mrgVoiceEnabled =
        false;

    }


    mrgUpdateVoiceToggleUI();


    if (mrgVoiceToggleBtn) {

      mrgVoiceToggleBtn.addEventListener(
        "click",
        mrgToggleVoice
      );

    }


    if (!mrgVoiceSynthSupported) {

      /*
        No speech synthesis available — voice replies simply never
        speak, but nothing else changes.
      */

      if (mrgVoiceToggleBtn) {

        mrgVoiceToggleBtn.style.display =
          "none";

      }

    }


    /*
      Speech recognition setup. If unsupported, hide the mic button
      and leave normal text chat fully functional.
    */

    if (
      !mrgVoiceSpeechSupported
    ) {

      if (mrgMicBtn) {

        mrgMicBtn.style.display =
          "none";

      }


      return;

    }


    try {

      mrgVoiceRecognition =
        new mrgVoiceSpeechRecognitionCtor();


      mrgVoiceRecognition.continuous =
        false;


      mrgVoiceRecognition.interimResults =
        false;


      mrgVoiceRecognition.lang =
        "en-IN";


      mrgVoiceRecognition.onstart =
        function () {

          mrgSetListeningUI(
            true
          );


          mrgSetVoiceStatus(
            "Listening…"
          );

        };


      mrgVoiceRecognition.onresult =
        mrgHandleSpeechResult;


      mrgVoiceRecognition.onerror =
        mrgHandleSpeechError;


      mrgVoiceRecognition.onend =
        function () {

          mrgSetListeningUI(
            false
          );


          if (
            mrgVoiceStatusEl &&
            mrgVoiceStatusEl.textContent === "Listening…"
          ) {

            mrgSetVoiceStatus(
              ""
            );

          }

        };

    }

    catch (e) {

      /*
        If construction fails for any reason, fall back gracefully
        to text-only input.
      */

      mrgVoiceSpeechSupported =
        false;


      mrgVoiceRecognition =
        null;


      if (mrgMicBtn) {

        mrgMicBtn.style.display =
          "none";

      }


      return;

    }


    if (mrgMicBtn) {

      mrgMicBtn.addEventListener(
        "click",
        mrgStartListening
      );

    }

  }


  initVoiceFeatures();

  /* =======================================================================
     EVENTS
     ======================================================================= */

  /*
    Enter is bound directly on the input. Relying on the form's implicit
    submission breaks whenever the send button is in its disabled state,
    which is what stopped the Enter key from working before.
  */

  inputEl.addEventListener('keydown', function (event) {

    if (event.key !== 'Enter' && event.keyCode !== 13) return;
    if (event.shiftKey || event.isComposing || event.keyCode === 229) return;

    event.preventDefault();
    event.stopPropagation();

    submitInput();

  });

  if (formEl) {
    formEl.addEventListener('submit', function (event) {
      event.preventDefault();
      submitInput();
      inputEl.focus();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', function (event) {
      event.preventDefault();
      submitInput();
      inputEl.focus();
    });
  }

  all('[data-command]').forEach(function (button) {
    button.addEventListener('click', function () {
      activity();
      handleMessage(button.dataset.command);
    });
  });

  all('[data-ask]').forEach(function (button) {
    button.addEventListener('click', function () {
      activity();
      handleMessage(button.dataset.ask);
    });
  });

  all('[data-background]').forEach(function (button) {
    button.addEventListener('click', function () {
      setBackground(button.dataset.background);
      savePreferences();
      activity();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      clearConversation();
      maskOpen = false;
      manualSleep = false;
      pendingAction = null;
      wake();
    });
  }

  inputEl.addEventListener('input', function () {
    activity();
    syncSend();
    followTyping();
  });

  ['keyup', 'click', 'focus', 'scroll'].forEach(function (name) {
    inputEl.addEventListener(name, followTyping);
  });

  document.addEventListener('pointermove', function (event) {
    if (!panelOpen) return;
    lookAt(event.clientX, event.clientY);
    var now = performance.now();
    if (now - pointerTime > 700) {
      activity();
      pointerTime = now;
    }
  }, { passive: true });

  var recallBtn = $('recall');
  if (recallBtn) {
    recallBtn.addEventListener('click', function () {
      wake(true);
    });
  }

  var settingsOpenBtn = $('settings-open');
  if (settingsOpenBtn) {
    settingsOpenBtn.addEventListener('click', function () {
      openSettings();
    });
  }

  ['settings-close', 'settings-done'].forEach(function (id) {
    var button = $(id);
    if (button) {
      button.addEventListener('click', function () {
        closeSettings();
      });
    }
  });

  if (settingsEl && !IS_WIDGET) {
    settingsEl.addEventListener('close', afterSettingsClose);
  }

  [['idle-setting', 'idle'], ['wander-setting', 'wander'], ['motion-setting', 'motion'], ['pace-setting', 'pace']]
    .forEach(function (pair) {
      var field = $(pair[0]);
      if (!field) return;
      field.addEventListener('change', function () {
        preferences[pair[1]] = pair[1] === 'pace' ? field.value : field.checked;
        applyPreferences();
        savePreferences();
        resetClock();
        if (!manualSleep) wake();
      });
    });

  document.addEventListener('visibilitychange', function () {
    clearTimers();
    if (document.hidden) {
      mrgStopSpeaking();
      mrgStopListening();
      if (['sleep', 'away'].indexOf(state) === -1) state = 'awake';
      renderState();
    } else {
      if (!manualSleep && panelOpen) wake();
      resetClock();
    }
  });


  /* =======================================================================
     WELCOME
     ======================================================================= */

  var welcomed = false;

  function sendWelcome() {

    if (welcomed) return;
    welcomed = true;

    addBotMessage(MIRAGE.intro, null, false);

    if (memory.name) {

      reply(
        'Welcome back, ' + memory.name + '! \uD83D\uDC4B\n\nWhat would you like to know?',
        null,
        [
          { label: 'What does this website do?', value: 'What does this website do?' },
          { label: 'What tools are available?', value: 'What tools are available?' },
          { label: 'How does Tool 1 work?', value: 'How does Tool 1 work?' }
        ]
      );

    } else {

      reply(
        'Tell me your name, or just ask me something about the site.',
        null,
        [
          { label: 'What does this website do?', value: 'What does this website do?' },
          { label: 'What tools are available?', value: 'What tools are available?' },
          { label: 'What can you do?', value: 'what can you do' }
        ]
      );

    }

  }


  /* =======================================================================
     BOOT
     ======================================================================= */

  applyPreferences();
  say(pick(MIRAGE.hello, 'hello'));
  syncSend();
  renderState();
  resetClock();

  setInterval(function () {
    tick();
  }, 500);


  /* =======================================================================
     WIDGET SHELL — open / close / public API
     ======================================================================= */

  var fab = D.querySelector('.mrg-fab');
  var closeBtn = $('mrg-close');

  /*
    On phones, the on-screen keyboard doesn't shrink the page's own
    viewport in most mobile browsers — it just draws over the bottom of
    the screen. Since this panel is position:fixed, its CSS height has
    no idea the keyboard exists, so the newest reply and the suggestion
    chips end up rendered behind the keyboard even though scrollBottom()
    correctly scrolled to what the panel *thinks* is its own bottom.
    The visualViewport API reports the actually-visible area, so we
    resize and reposition the panel to match it whenever the keyboard
    opens, closes, or the page scrolls under it. This makes it
    structurally impossible for the latest message to end up hidden.
  */

  function syncViewportToVisual() {

    if (!window.visualViewport || !panelOpen) {
      return;
    }

    var vv = window.visualViewport;
    var bottomGap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

    win.style.height = vv.height + 'px';
    win.style.bottom = bottomGap + 'px';

    scrollBottom();

  }

  function releaseViewportOverride() {
    win.style.height = '';
    win.style.bottom = '';
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewportToVisual);
    window.visualViewport.addEventListener('scroll', syncViewportToVisual);
  }

  inputEl.addEventListener('focus', function () {
    // The keyboard animates in over ~150-300ms on most devices; the
    // viewport resize event can lag slightly behind that, so this is a
    // deliberate second nudge rather than a duplicate of the listener above.
    setTimeout(function () {
      syncViewportToVisual();
      scrollBottom();
    }, 320);
  });

  function openChat() {

    panelOpen = true;
    host.classList.add('open');

    resetClock();

    if (!manualSleep) {
      wake();
    } else {
      renderState();
    }

    sendWelcome();

    syncViewportToVisual();

    setTimeout(function () {
      inputEl.focus();
    }, 220);

  }

  function closeChat() {

    panelOpen = false;

    mrgStopSpeaking();
    mrgStopListening();

    if (settingsIsOpen()) closeSettings();

    host.classList.remove('open');
    clearTimers();

    releaseViewportOverride();

    fab.focus();

  }

  fab.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);

  D.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panelOpen) {
      if (settingsIsOpen()) closeSettings();
      else closeChat();
    }
  });

  window.MirageCompanion = {

    open: openChat,

    close: closeChat,

    toggle: function () {
      if (panelOpen) closeChat();
      else openChat();
    },

    ask: function (text) {
      openChat();
      setTimeout(function () {
        handleMessage(text);
      }, 260);
    },

    forget: function () {
      try {
        localStorage.removeItem(CFG.storageKey);
      } catch (e) {}
      memory.name = null;
    }

  };


  }

  if (document.body) {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }

})();
