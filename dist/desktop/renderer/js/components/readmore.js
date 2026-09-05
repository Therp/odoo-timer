
const { Component, useState } = owl;

/**
 * Create the compiled template used by the shared ReadMore component.
 *
 * Supports optional links for popup rows and plain text rendering for
 * options page tables.
 *
 * @param {object} app OWL app instance.
 * @param {object} bdom OWL block DOM helpers.
 * @returns {Function} Compiled template.
 */
export function createReadMoreTemplate(app, bdom) {
  const { text, createBlock } = bdom;

  const linkBlock = createBlock(
    `<a block-attribute-0="href" class="remote-link" target="_blank" rel="noreferrer"><block-text-1/></a>`
  );

  const wrapperBlock = createBlock(
    `<span class="readmore-inline"><block-child-0/><block-child-1/></span>`
  );

  const toggleBlock = createBlock(
    `<a href="#" class="hmMoreClass" block-handler-0="click"><block-text-1/></a>`
  );

  return function template(ctx) {
    const displayText =
      ctx.state.expanded || !ctx.needsTrim ? (ctx.props.text || '') : ctx.shortText;

    const contentNode = ctx.props.href
      ? linkBlock([ctx.props.href, displayText])
      : text(displayText);

    let toggleNode = null;
    if (ctx.needsTrim) {
      toggleNode = toggleBlock([
        ['prevent', ctx.toggle, ctx],
        ctx.state.expanded ? ' ▲' : ' ...',
      ]);
    }

    return wrapperBlock([], [contentNode, toggleNode]);
  };
}

export class ReadMore extends Component {
  static props = ['text', 'limit?', 'href?', 'title?'];
  static template = 'ReadMore';

  setup() {
    this.state = useState({ expanded: false });
  }

  get needsTrim() {
    return (this.props.text || '').length > (this.props.limit || 40);
  }

  get shortText() {
    return (this.props.text || '').slice(0, this.props.limit || 40);
  }

  toggle() {
    this.state.expanded = !this.state.expanded;
  }
}
