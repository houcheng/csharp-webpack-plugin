# csharp-webpack-plugin

This is a plugin for Webpack that generates TypeScript interfaces and JavaScript wrapper functions from C# source code. It is based on the [csharp-models-to-typescript](https://github.com/svenheden/csharp-models-to-typescript) library.

## Usage
To use this plugin, you must have .NET Core SDK installed on your system. You also need to create a csconfig.json file in the root of your project, with the following configuration:



```json
{
    "include": [
        "src/csharp/**/*.cs"
    ]
}
```

OR

```json 
{
    "include": [
        "src/csharp/**/*.cs"
    ],
    "ignoreTypes": [
        "PeriodStudentCompare"
    ],
    "baseTypeTs": "src/csharp/BaseType.ts"    
}

```

The "include" property specifies the C# source files to parse. The optional "ignoreTypes" property can be used to exclude certain types from being generated. The optional "baseTypeTs" property is the path to the TypeScript file that contains the base types for your application.



To use the plugin, add it to your Webpack configuration:

```javascript
const CSharpWebpackPlugin = require('csharp-webpack-plugin');

module.exports = {
    // ...
    plugins: [
        new CSharpWebpackPlugin()
    ]
};
```



When you run Webpack, the plugin will generate TypeScript interfaces and JavaScript wrapper functions for each of the types defined in your C# source code. For each "Xxx.cs" file, it generates "Xxx.ts" and "XxxWrappers.js" files.



## Output

The plugin generates two files for each C# class or struct:

- Xxx.ts: TypeScript interface for the type
- XxxWrappers.js: JavaScript wrapper function with JSDoc annotations

The TypeScript interface is generated based on the public properties and methods of the C# type. The JavaScript wrapper function is a thin wrapper around the .NET Core CLR hosting API, and provides an easy-to-use JavaScript API for interacting with the C# code.



Example output Api.ts:

```typescript
// src\csharp\Api.cs
export interface PostLeavesStatistics {
    Added: number;
    Modified: number;
    Deleted: number;
}
// src\csharp\Api.cs
export interface GaMergedRegistration {
    IsTeam: boolean;
    Registration: GaRegistration;
    Ga: GameActivity;
    Team: GaTeam;
}
```

Example output ApiWrappers.js

```javascript
/** @returns {PostLeavesStatistics} */
export const toPostLeavesStatistics = (o) => (o)

/** @returns {GaMergedRegistration} */
export const toGaMergedRegistration = (o) => (o)
```







## License

This project is licensed under the MIT License. See the `LICENSE` file for more information.



