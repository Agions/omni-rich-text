/**
 * omni-rich-text/wechat entry point
 *
 * Re-exports core parsing utilities so page JS can call parseRichContent
 * directly and pass the resulting AST to the <omni-rich-text> component via
 * the `nodes` property.
 */
const { parseRichContent, chunkAST } = require('../core');

module.exports = { parseRichContent, chunkAST };
