import HttpError from 'http-errors';
import contentTypeLib from 'content-type';
import { camelCaseObj, snakeCaseObj } from '../lib/common';

// Parses incoming request body as JSON
// Converts incoming request body keys (deep) to camelCase
// Converts outgoing response body keys (deep) to snake_case
// Stringifies outgoing request body as JSON, sets Content-Type header

/* eslint-disable no-param-reassign */
const jsonBodiesMiddleware = ({ requireJson = true, logger }) =>
  ({
    before: (handler, next) => {
      logger.debug('jsonBodiesMiddleware.before');
      const { headers, httpMethod } = handler.event;
      if (!headers) {
        return next();
      }
      const contentType = headers['Content-Type'] || headers['content-type'];
      if (contentType) {
        const { type } = contentTypeLib.parse(contentType);
        if (type === 'application/json') {
          try {
            handler.event.body = JSON.parse(handler.event.body);
          } catch (err) {
            throw new HttpError.UnprocessableEntity('Content type defined as JSON but an invalid JSON was provided');
          }
        } else if (requireJson && (httpMethod || '').toUpperCase() !== 'GET') {
          throw new HttpError.NotAcceptable('Unsupported Content-Type.');
        }
      }
      if (handler.event.body) {
        handler.event.body = camelCaseObj(handler.event.body);
      }
      return next();
    },
    after: (handler, next) => {
      logger.addContext('jsonBodiesMiddleware.after.handler.response', handler.response);
      logger.debug('jsonBodiesMiddleware.after');

      let statusCode = 204;
      let body = '';
      let headers;

      if (handler.response) {
        body = snakeCaseObj(handler.response.body || handler.response);
        statusCode = handler.response.statusCode || 200;
      }

      const { headers: requestHeaders } = handler.event;
      if (requestHeaders) {
        const acceptType = requestHeaders.Accept || requestHeaders.accept;
        const { type } = contentTypeLib.parse(acceptType);
        if (type === 'application/json') {
          headers = handler.response.headers || {};
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(body);
        }
      }

      handler.response = {
        statusCode,
        body,
        headers,
      };

      logger.addContext('jsonBodiesMiddleware.after result', handler.response);
      logger.debug('jsonBodiesMiddleware.after done');
      return next();
    },
  })
;
/* eslint-enable no-param-reassign */
module.exports = jsonBodiesMiddleware;
