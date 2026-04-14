describe('upload middleware error mapping', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('maps unsupported file type to UploadValidationError 415', () => {
    const { _internal } = require('../middleware/upload');
    const cb = jest.fn();

    _internal.fileFilter({}, { originalname: 'malware.exe', mimetype: 'application/x-msdownload' }, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    const [err, passed] = cb.mock.calls[0];
    expect(passed).toBe(false);
    expect(err.name).toBe('UploadValidationError');
    expect(err.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(err.status).toBe(415);
  });

  it('accepts generic mime for valid extension and relies on magic-byte validation', () => {
    const { _internal } = require('../middleware/upload');
    const cb = jest.fn();

    _internal.fileFilter({}, { originalname: 'deck.pptx', mimetype: 'application/octet-stream' }, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('returns 422 for magic-byte mismatch instead of 500', () => {
    const unlinkSync = jest.fn();
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      unlinkSync,
      openSync: jest.fn().mockReturnValue(1),
      closeSync: jest.fn(),
      readSync: jest.fn((fd, buffer) => {
        // invalid PDF signature
        buffer[0] = 0x50;
        buffer[1] = 0x4B;
        buffer[2] = 0x03;
        buffer[3] = 0x04;
      }),
    }));

    const { validateMagicBytes } = require('../middleware/upload');

    const req = { file: { originalname: 'file.pdf', path: '/tmp/file.pdf' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    validateMagicBytes(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MAGIC_BYTE_MISMATCH' }));
    expect(unlinkSync).toHaveBeenCalled();
  });
});
