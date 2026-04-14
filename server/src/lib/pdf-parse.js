const pdfParseModule = require('pdf-parse');

const parsePdf = typeof pdfParseModule === 'function'
  ? pdfParseModule
  : (typeof pdfParseModule?.default === 'function' ? pdfParseModule.default : null);

if (!parsePdf) {
  throw new Error('pdf-parse export is not callable');
}

module.exports = parsePdf;
