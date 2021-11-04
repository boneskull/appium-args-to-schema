#!/usr/bin/env node
// @ts-check

/**
 * This silly little script tries to find `argsConstraints` in a driver's main class and convert that
 * into a schema.
 *
 * Schema is stored in the `appium.schema` field of `package.json`, but it can be moved to a separate
 * file if desired (change the value of `appium.schema` to the relative path to this file).
 *
 * Usage:
 *
 * ```bash
 * node ./scripts/migrate-args.js <path-to-driver-dir>
 * ```
 */

import _ from 'lodash';
import {readPackageUpSync} from 'read-pkg-up';
import {writePackageSync} from 'write-pkg';
import resolveFrom from 'resolve-from';

const BASE_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  properties: {},
  additionalProperties: false,
};

/**
 * @param {string} driver
 */
export async function main(driver) {
  if (!driver) {
    console.error(`usage:\n\nappium-args-to-schema <path-to-driver-dir>`);
    process.exitCode = 1;
    return;
  }

  const modulePath = resolveFrom(process.cwd(), driver);

  console.error(`resolved ${driver} to ${modulePath}`);

  const {path: pkgJsonPath, packageJson: driverPkg} = readPackageUpSync({
    cwd: modulePath,
    normalize: false,
  });

  const mainClass = /** @type {object} */ (driverPkg)?.appium?.mainClass;

  if (!mainClass) {
    console.error(`Could not find Appium main class in ${pkgJsonPath}`);
    process.exitCode = 1;
    return;
  }

  const driverModule = await import(modulePath);
  const driverClass =
    driverModule[mainClass] ?? driverModule.default ?? driverModule;

  if (/** @type {object} */ (driverPkg).appium?.schema) {
    console.error(`${driver} already has a schema!`);
    process.exitCode = 1;
    return;
  }

  if (driverClass.argsConstraints) {
    const pkgName = driverPkg.name;

    /**
     * @type {object}
     */
    const schema = {
      ..._.cloneDeep(BASE_SCHEMA),
      title: `${pkgName} Driver Configuration`,
      description: `Appium configuration schema for the ${pkgName} driver.`,
    };

    _.forEach(driverClass.argsConstraints, (spec, argName) => {
      const prop = {};
      const propName = _.kebabCase(argName);
      if (spec.isString) {
        prop.type = 'string';
      } else if (spec.isBoolean) {
        prop.type = 'boolean';
      } else if (spec.isNumber) {
        prop.type = 'integer';
      }
      if (prop.inclusion) {
        prop.enum = spec.inclusion;
      }
      if (prop.isArray) {
        prop.type = 'array';
        prop.items = {
          type: 'string',
        };
      }
      if (prop.isObject) {
        prop.type = 'object';
        prop.allowAdditionalProperties = true;
      }
      if (prop.presence) {
        schema.required = [...(schema.required ?? []), propName];
      }
      if (_.camelCase(argName) !== propName) {
        prop.appiumCliDest = argName;
      }
      schema.properties[propName] = prop;
    });

    _.set(driverPkg, 'appium.schema', schema);

    writePackageSync(
      pkgJsonPath,
      /** @type {import('type-fest').JsonObject} */ (driverPkg),
      {normalize: false},
    );
    console.error(
      `wrote the following schema to ${pkgJsonPath}:\n\n${JSON.stringify(
        schema,
        null,
        2,
      )}\nIMPORTANT: Don't forget to remove argsConstraints from ${mainClass}!`,
    );
    return;
  }

  console.error(
    `no argsConstraints found in driver ${driver}, module ${modulePath} and main class name ${mainClass}`,
  );
  process.exitCode = 1;
}

main(process.argv[2]);
