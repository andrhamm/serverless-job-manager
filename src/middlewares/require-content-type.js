import createError from 'http-errors';
import contentTypeLib from 'content-type';

const requireContentTypeMiddleware = ({ allowedContentTypes = [] }) =>
  ({
    before: (handler, next) => {
      const { event } = handler;
      if (event.headers && allowedContentTypes && event.headers['Content-Type']) {
        const header = event.headers['Content-Type'];
        const { contentType } = contentTypeLib.parse(header);

        // this might be too rudimentary for some use cases
        if (!allowedContentTypes.find(allowedType => contentType === allowedType)) {
          throw new createError.NotAcceptable(`Unsupported Content-Type. Acceptable values: ${allowedContentTypes.join(', ')}`);
        }
      }

      return next();
    },
  })
;

module.exports = requireContentTypeMiddleware;
