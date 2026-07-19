export function assertTestDatabase(databaseUrl: string): void {
  const databaseName = new URL(databaseUrl).pathname.split('/').pop();
  if (!databaseName?.endsWith('_test')) {
    throw new Error(
      `Refusing to run destructive e2e tests against database: ${databaseName}`,
    );
  }
}
