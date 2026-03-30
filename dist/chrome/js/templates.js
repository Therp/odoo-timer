export const templates = {
 "OptionsApp": function OptionsApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  
  let block3 = createBlock(`<div><div id="navigation"><h1 class="title-app">Timer Options</h1></div><div class="options-box box"><!-- See js/components/options-app.js for the current runtime template. --></div></div>`);
  
  return function template(ctx, node, key = "") {
    const b2 = comment(` Source Owl template for future ahead-of-time compilation.
         Runtime falls back to js/components/options-app.js until a compiled
         template is registered in js/templates.js. `);
    const b3 = block3();
    return multi([b2, b3]);
  }
},

"PopupApp": function PopupApp(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  
  let block3 = createBlock(`<div class="app-root"><div id="loader-container" block-attribute-0="class"><div class="loader-card"><div class="loader-text">Loading current session and projects…</div><div class="loader-subtext">Please wait — or grab a cup of coffee ☕</div><i class="fa fa-cog fa-spin fa-5x"/></div></div><div id="login" class="login-view" block-attribute-1="class"><!-- See js/components/popup-app.js for the current runtime template. --></div><div id="wrapper" block-attribute-2="class"><!-- Full source template migration can be developed here without
             disturbing the working runtime fallback. --></div></div>`);
  
  return function template(ctx, node, key = "") {
    const b2 = comment(` Source Owl template for future ahead-of-time compilation.
         The runtime currently falls back to the createBlock implementation
         in js/components/popup-app.js when compiled templates are not
         registered in js/templates.js. `);
    let attr1 = ctx['state'].view==='loading'?'':'hide';
    let attr2 = ctx['state'].view==='login'?'login-view':'login-view hide';
    let attr3 = ctx['state'].view==='main'?'':'hide';
    const b3 = block3([attr1, attr2, attr3]);
    return multi([b2, b3]);
  }
},

"ReadMore": function ReadMore(app, bdom, helpers
) {
  let { text, createBlock, list, multi, html, toggler, comment } = bdom;
  let { safeOutput, callHandler } = helpers;
  const hdlr_fn1 = (ctx, ev) => callHandler(ctx['toggle'], ctx, ev);
  
  let block1 = createBlock(`<span class="readmore-inline"><block-child-0/><block-child-1/><block-child-1/><block-child-2/></span>`);
  let block2 = createBlock(`<a block-attribute-0="href" class="remote-link" target="_blank" rel="noreferrer"><block-child-0/></a>`);
  let block5 = createBlock(`<a href="#" class="hmMoreClass" block-handler-0="click.prevent"><block-child-0/></a>`);
  
  return function template(ctx, node, key = "") {
    let b2, b4, b5;
    if (ctx['props'].href) {
      let attr1 = ctx['props'].href;
      const b3 = safeOutput(ctx['state'].expanded||!ctx['needsTrim']?(ctx['props'].text||''):ctx['shortText']);
      b2 = block2([attr1], [b3]);
    } else {
      b4 = safeOutput(ctx['state'].expanded||!ctx['needsTrim']?(ctx['props'].text||''):ctx['shortText']);
    }
    if (ctx['needsTrim']) {
      let hdlr1 = ["prevent", hdlr_fn1, ctx];
      const b6 = safeOutput(ctx['state'].expanded?' ▲':' ...');
      b5 = block5([hdlr1], [b6]);
    }
    return block1([], [b2, b4, b5]);
  }
},
 
}