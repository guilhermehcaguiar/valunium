import { Logger } from '@nestjs/common';
import { createApplication } from './application';
import { readEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const environment = readEnvironment();
  const app = await createApplication(environment);
  await app.listen(environment.port, environment.host);
}

void bootstrap().catch(() => {
  new Logger('Bootstrap').error('API startup failed; verify environment and port availability');
  process.exitCode = 1;
});
