module.exports = class CustomError extends Error {
  constructor (message, extra) {

    // Calling parent constructor of base Error class.
    super(`${message}\nExtra: ${JSON.stringify(extra)}`);

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name;
    // this.name = 'CustomError'; // might have to do this when minifying

    // Capturing stack trace, excluding constructor call from it.
    Error.captureStackTrace(this, this.constructor);
  }
};
