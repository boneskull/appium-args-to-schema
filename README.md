# appium-args-to-schema

> Small script to convert `argsConstraints`-using [Appium](https://appium.io) drivers to JSON schemas

## Usage

Tested with Node.js v16+.

```shell
npx https://github.com/boneskull/appium-args-to-schema /path/to/driver
```

This will find `argsConstraints` in the driver's main class and convert it to the `appium.schema` property in its `package.json`.  

**This command will modify the driver's `package.json` file.**

Once it's completed, inspect the `package.json`, remove `argsConstraints` from the main class, and commit changes.

## License

Copyright 2021 Christopher Hiller.  Licensed 0BSD
