import { Inject, Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  constructor(@Inject('DatabasePool') private readonly pool: Pool) {}
  async fetchQuery(queryId: string) {
    this.logger.debug(`Fetching query ${queryId}`);
    const query = await fs.readFile(`../queries/${queryId}`, 'utf-8');
    return query;
  }
  async executeQuery(queryId: string, bindParams: any[]) {
    const query = await this.fetchQuery(queryId);
    this.logger.debug(`Loaded query [QUERY]: ${query}\n with bind params [PARAMS]: ${bindParams.join(" | ")}`);
    const { rows } = await this.pool.query(query, bindParams);
    this.logger.debug(`Executed query with result ${rows}`);
    return rows;
  }
  async executeQueryWithClient(queryId: string, bindParams: any[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = await this.fetchQuery(queryId);
      this.logger.debug(`Loaded query [QUERY]: ${query}\n with bind params [PARAMS]: ${bindParams.join(" | ")}`);
      const { rows } = await client.query(query, bindParams);
      this.logger.debug(`Executed query with result ${rows}`);
      await client.query('COMMIT');
      return rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  async prepareQuery(
    queryId: string,
    params: { types: string[]; values: any[][] },
  ): Promise<string> {
    // Does not provide type safety against sql scripts. User must validate the prepared query
    const preparePrefix: string = `PREPARE ${queryId} (${params.types.join(
      ', ',
    )}) AS`;
    const query: string = await this.fetchQuery(queryId);
    const preparedValues: string[] = params.values.map((elem) => {
      const templateValue: string = elem
        .map((val) => {
          if (typeof val == 'string' || val instanceof String) {
            val = `'${val}'`;
          }
          return val;
        })
        .join(', ');
      return `EXECUTE ${queryId} (${templateValue})`;
    });
    const BuiltQuery: string = [
      preparePrefix,
      query,
      preparedValues.join('\n'),
    ].join('\n');
    return BuiltQuery;
  }
}
