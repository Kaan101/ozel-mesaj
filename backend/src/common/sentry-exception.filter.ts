import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";

// Gorev 7.5: Tum hatalari yakalayan global filter. Sadece 5xx
// (beklenmeyen/programlama) hatalarini Sentry'e gonderiyoruz; 400/401/
// 403/404/429 gibi normal is akisi hatalarini "gurultu" olarak Sentry'e
// tasimiyoruz - boylece panelde gercekten onemli olan hatalar bogulmaz.
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;
    const httpStatus = isHttpException ? exception.getStatus() : 500;

    if (!isHttpException || httpStatus >= 500) {
      Sentry.captureException(exception);
    }

    const message = isHttpException
      ? (exception.getResponse() as any)
      : { statusCode: 500, message: "Internal server error" };

    httpAdapter.reply(response, message, httpStatus);
  }
}
