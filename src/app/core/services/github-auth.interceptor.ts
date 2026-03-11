import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Injects an optional GitHub Bearer token into all requests to api.github.com.
 * The token is sourced from the environment config — never hardcoded.
 *
 * When no token is configured, the request proceeds unauthenticated
 * (subject to GitHub's 10 req/min rate limit for search endpoints).
 *
 * With a token, the rate limit increases to 5,000 requests/hour.
 */
export const githubAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = environment.githubToken;

  if (!token || !req.url.includes('api.github.com')) {
    return next(req);
  }

  const authenticatedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedReq);
};
