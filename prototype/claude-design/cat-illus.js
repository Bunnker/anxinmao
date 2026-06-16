/* 小猫怎么了 · cute cat illustration kit (shared) */
window.CatIllus = (function(){
  var EARS =
    '<path d="M10.5 14.6 C9.6 8 11.4 4.5 13.7 4.7 C15.3 6.9 17 11 17.8 13.7 Z" fill="#e2914f"/>'+
    '<path d="M33.5 14.6 C34.4 8 32.6 4.5 30.3 4.7 C28.7 6.9 27 11 26.2 13.7 Z" fill="#e2914f"/>'+
    '<path d="M12.4 12.8 C12 9 13 7.3 14.2 7.5 C15.1 8.9 16 10.9 16.3 12.5 Z" fill="#f4c99c"/>'+
    '<path d="M31.6 12.8 C32 9 31 7.3 29.8 7.5 C28.9 8.9 28 10.9 27.7 12.5 Z" fill="#f4c99c"/>';
  var HEAD =
    '<ellipse cx="22" cy="23" rx="13.4" ry="12.4" fill="#eca468"/>'+
    '<ellipse cx="22" cy="26.6" rx="8.6" ry="6.6" fill="#f6d4ac"/>'+
    '<path d="M22 11.6 v3.2 M17.6 12.6 l1.2 2.8 M26.4 12.6 l-1.2 2.8" stroke="#cf8542" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>';
  var BLUSH =
    '<ellipse cx="13.6" cy="25" rx="2.7" ry="1.8" fill="#f0a098" opacity=".5"/>'+
    '<ellipse cx="30.4" cy="25" rx="2.7" ry="1.8" fill="#f0a098" opacity=".5"/>';
  var NOSE = '<path d="M20.3 23.6 h3.4 l-1.7 1.8 z" fill="#c2756a"/>';

  var EYE = {
    open:'<circle cx="16" cy="21" r="2.9" fill="#4b3326"/><circle cx="28" cy="21" r="2.9" fill="#4b3326"/>'+
         '<circle cx="17.2" cy="19.9" r="1.05" fill="#fff"/><circle cx="29.2" cy="19.9" r="1.05" fill="#fff"/>'+
         '<circle cx="15.1" cy="22.1" r=".5" fill="#fff" opacity=".7"/><circle cx="27.1" cy="22.1" r=".5" fill="#fff" opacity=".7"/>',
    happy:'<path d="M13.4 21.8 q2.6 -3.2 5.2 0 M25.4 21.8 q2.6 -3.2 5.2 0" stroke="#4b3326" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
    worry:'<path d="M12.8 17.6 l4.6 1.7 M31.2 17.6 l-4.6 1.7" stroke="#4b3326" stroke-width="1.5" stroke-linecap="round"/>'+
          '<circle cx="16.2" cy="21.4" r="2.4" fill="#4b3326"/><circle cx="27.8" cy="21.4" r="2.4" fill="#4b3326"/>'+
          '<circle cx="17.1" cy="20.6" r=".85" fill="#fff"/><circle cx="28.7" cy="20.6" r=".85" fill="#fff"/>',
    squeeze:'<path d="M13.4 20 l3.7 1.4 l-3.7 1.4 M30.6 20 l-3.7 1.4 l3.7 1.4" stroke="#4b3326" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    droop:'<path d="M13.4 21.6 q2.6 2 5.2 0 M25.4 21.6 q2.6 2 5.2 0" stroke="#4b3326" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    side:'<circle cx="17.2" cy="21" r="2.9" fill="#4b3326"/><circle cx="29.2" cy="21" r="2.9" fill="#4b3326"/>'+
         '<circle cx="18.2" cy="20" r="1" fill="#fff"/><circle cx="30.2" cy="20" r="1" fill="#fff"/>'
  };
  var MOU = {
    smile:'<path d="M19.4 26.6 q2.6 2.4 5.2 0" stroke="#a06a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    tiny:'<path d="M20.4 26.4 q1.6 1.3 3.2 0" stroke="#a06a55" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    frown:'<path d="M19.4 27.2 q2.6 -2.2 5.2 0" stroke="#a06a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    pant:'<ellipse cx="22" cy="27" rx="2.2" ry="2.7" fill="#a85a4f"/><path d="M22 24.6 v2" stroke="#9c5248" stroke-width="1"/>',
    open:'<ellipse cx="22" cy="27" rx="2.5" ry="2.3" fill="#a85a4f"/>'
  };

  function cat(o){
    o = o || {};
    return '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + EARS
      + (o.behind || '')
      + HEAD
      + (o.noBlush ? '' : BLUSH)
      + (o.eyes || EYE.open)
      + NOSE
      + (o.mouth || MOU.tiny)
      + (o.front || '')
      + '</svg>';
  }

  // symptom map (keyed by card title)
  var SYM = {
    '可能误食': cat({eyes:EYE.worry, mouth:MOU.tiny, front:
      '<path d="M32 33 q5 -5.6 9 -2.8 q-3.3 5.9-9 2.8 z" fill="#9fb878"/><path d="M36.6 30.5 q-.5 2.3-2.5 3.7" stroke="#728c50" stroke-width="1.1" fill="none"/>'}),
    '呼吸怪': cat({eyes:EYE.worry, mouth:MOU.pant, front:
      '<path d="M34 18.5 q4.6 -1 5.7 1.9 M34 23 q5.1 0 6.1 3" stroke="#c2b4a2" stroke-width="1.6" fill="none" stroke-linecap="round"/>'}),
    '看到血': cat({eyes:EYE.worry, mouth:MOU.frown, front:
      '<path d="M33.4 27.2 c0 2.6-1.9 4-1.9 4S29.6 29.8 29.6 27.2a1.9 1.9 0 0 1 3.8 0 z" fill="#b05a50"/>'}),
    '尿不出': cat({eyes:EYE.worry, mouth:MOU.frown, behind:
      '<rect x="6" y="34" width="32" height="7.5" rx="2.6" fill="#d9e4e7"/><rect x="6" y="34" width="32" height="2.6" rx="1.3" fill="#c4d4d9"/><circle cx="13" cy="38.6" r="1.1" fill="#afc0c5"/><circle cx="22" cy="39.1" r="1.1" fill="#afc0c5"/><circle cx="30" cy="38.6" r="1.1" fill="#afc0c5"/>'}),
    '呕吐': cat({eyes:EYE.squeeze, mouth:MOU.open, front:
      '<path d="M20 30.4 q-.6 2.6-.2 4.5 M24 30.4 q.6 2.6.2 4.5 M22 30.8 v4.9" stroke="#b9b06a" stroke-width="1.7" fill="none" stroke-linecap="round"/>'}),
    '腹泻': cat({eyes:EYE.droop, mouth:MOU.frown, behind:
      '<path d="M9 35 q3 -2.2 6.5 0 t6.5 0 t6.5 0" stroke="#c3a46b" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M10 38.6 q3 -2.2 6.5 0 t6.5 0 t6.5 0" stroke="#cfb480" stroke-width="1.5" fill="none" stroke-linecap="round"/>'}),
    '不吃东西': cat({eyes:EYE.side, mouth:MOU.frown, front:
      '<path d="M28.5 35.4 h10.5 a5.25 5.25 0 0 1 -10.5 0 z" fill="#e9dbc6"/><ellipse cx="33.7" cy="35.4" rx="5.25" ry="1.4" fill="#dac8ad"/>'}),
    '精神差': cat({eyes:EYE.droop, mouth:MOU.frown, front:
      '<path d="M33.5 13.5 q2.6 .4 3 2.8 M35 11.8 q1.8 .3 2.1 2" stroke="#bca793" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".7"/>'}),
    '打喷嚏 / 流鼻涕': cat({eyes:EYE.squeeze, mouth:MOU.tiny, front:
      '<path d="M33 24 q4 -.6 5.7 1.7 M33.5 27 q3.4 .4 4.6 2.6" stroke="#a7cddc" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="39.6" cy="23.4" r="1.35" fill="#bfdde8"/>'}),
    '耳朵问题': cat({eyes:EYE.squeeze, mouth:MOU.frown, front:
      '<ellipse cx="34.2" cy="12.4" rx="3.5" ry="2.7" fill="#eaa86c" transform="rotate(20 34.2 12.4)"/><path d="M32.7 10.7 v-1.6 M34.2 10.2 v-1.8 M35.7 10.8 v-1.5" stroke="#cf8542" stroke-width="1" stroke-linecap="round"/>'}),
    '皮肤痒 / 掉毛': cat({eyes:EYE.squeeze, mouth:MOU.frown, front:
      '<ellipse cx="9.4" cy="26.4" rx="3.4" ry="2.6" fill="#eaa86c" transform="rotate(-18 9.4 26.4)"/><circle cx="12.8" cy="30.4" r="1" fill="#cf8a6e"/><circle cx="15.4" cy="32.2" r=".9" fill="#cf8a6e"/><circle cx="11" cy="33" r=".75" fill="#cf8a6e"/>'}),
    '眼睛问题': cat({eyes:'<circle cx="16" cy="21" r="2.5" fill="#4b3326"/><circle cx="28.4" cy="21.2" r="3.2" fill="#4b3326"/><circle cx="29.5" cy="20.1" r="1.15" fill="#fff"/><circle cx="17" cy="20.1" r=".9" fill="#fff"/>', mouth:MOU.frown, front:
      '<path d="M30 25 c0 2-1.5 3.1-1.5 3.1S27 27 27 25a1.5 1.5 0 0 1 3 0 z" fill="#a7cddc"/>'})
  };

  // mood (for report hero etc.)
  var MOOD = {
    worried: cat({eyes:EYE.worry, mouth:MOU.frown}),
    relieved: cat({eyes:EYE.happy, mouth:MOU.smile}),
    sleepy: cat({eyes:EYE.droop, mouth:MOU.tiny})
  };

  return { cat:cat, EYE:EYE, MOU:MOU, SYM:SYM, MOOD:MOOD };
})();
