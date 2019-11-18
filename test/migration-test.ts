/* eslint-disable no-unused-expressions */
import sinon, { SinonSpy } from 'sinon';
import { expect } from 'chai';
import Migration from '../src/migration';
import { DB } from '../src/db'
import { RunnerOption } from 'runner';

const callbackMigration = '1414549381268_names.js';
const promiseMigration = '1414549381268_names_promise.js';
const migrationsTable = 'pgmigrations';

const actionsCallback = require(`./${callbackMigration}`); // eslint-disable-line import/no-dynamic-require,security/detect-non-literal-require
const actionsPromise = require(`./${promiseMigration}`); // eslint-disable-line import/no-dynamic-require,security/detect-non-literal-require

describe('lib/migration', () => {
  const dbMock = {} as DB;
  const log: typeof console.log = () => null;
  const options = { migrationsTable } as RunnerOption;
  let migration;
  let queryMock: SinonSpy

  beforeEach(() => {
    queryMock = dbMock.query = sinon.spy();
  });

  describe('self.applyUp', () => {
    it('normal operations: db.query should be called', () => {
      migration = new Migration(
        dbMock,
        callbackMigration,
        actionsCallback,
        options,
        {},
        log
      );
      return migration.apply('up').then(() => {
        expect(queryMock).to.be.called;
      });
    });

    it('normal operations: db.query should be called when returning promise', () => {
      migration = new Migration(
        dbMock,
        promiseMigration,
        actionsPromise,
        options,
        {},
        log
      );
      return migration.apply('up').then(() => {
        expect(queryMock).to.be.called;
      });
    });

    it('--dry-run option: db.query should not be called', () => {
      migration = new Migration(
        dbMock,
        callbackMigration,
        actionsCallback,
        { ...options, dryRun: true },
        {},
        log
      );
      return migration.apply('up').then(() => {
        expect(queryMock).to.not.be.called;
      });
    });

    it('should make proper SQL calls', () => {
      migration = new Migration(
        dbMock,
        promiseMigration,
        actionsCallback,
        options,
        {},
        log
      );
      return migration.apply('up').then(() => {
        expect(queryMock).to.have.callCount(4);
        expect(queryMock.getCall(0).args[0]).to.equal('BEGIN;');
        expect(queryMock.getCall(1).args[0]).to.include('CREATE TABLE');
        expect(queryMock.getCall(2).args[0]).to.include(
          `INSERT INTO "public"."${migrationsTable}"`
        );
        expect(queryMock.getCall(3).args[0]).to.equal('COMMIT;');
      });
    });

    it('should fail with an error message if the migration is invalid', () => {
      const invalidMigrationName = 'invalid-migration';
      migration = new Migration(dbMock, invalidMigrationName, {}, options, {}, log);
      const direction = 'up';
      let error;
      try {
        migration.apply(direction);
      } catch (err) {
        error = err;
      }
      // expecting outside the catch block ensures that the test will fail if the
      // an exception is not caught
      expect(error.toString()).to.include(
        `${invalidMigrationName} exporting a '${direction}' function`
      );
    });
  });

  describe('self.applyDown', () => {
    it('normal operations: db.query should be called', () => {
      migration = new Migration(
        dbMock,
        callbackMigration,
        actionsCallback,
        options,
        {},
        log
      );
      return migration.apply('down').then(() => {
        expect(queryMock).to.be.called;
      });
    });

    it('--dry-run option: db.query should not be called', () => {
      migration = new Migration(
        dbMock,
        callbackMigration,
        actionsCallback,
        { ...options, dryRun: true },
        {},
        log
      );
      return migration.apply('down').then(() => {
        expect(queryMock).to.not.be.called;
      });
    });

    it('should make proper SQL calls', () => {
      migration = new Migration(
        dbMock,
        promiseMigration,
        actionsCallback,
        options,
        {},
        log
      );
      return migration.apply('down').then(() => {
        expect(queryMock).to.have.callCount(4);
        expect(queryMock.getCall(0).args[0]).to.equal('BEGIN;');
        expect(queryMock.getCall(1).args[0]).to.include('DROP TABLE');
        expect(queryMock.getCall(2).args[0]).to.include(
          `DELETE FROM "public"."${migrationsTable}"`
        );
        expect(queryMock.getCall(3).args[0]).to.equal('COMMIT;');
      });
    });
  });
});