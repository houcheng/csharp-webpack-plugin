const path = require('path');
const camelcase = require('camelcase');

const flatten = arr => arr.reduce((a, b) => a.concat(b), []);

const arrayRegex = /^(.+)\[\]$/;
const simpleCollectionRegex = /^(?:I?List|IReadOnlyList|IEnumerable|ICollection|IReadOnlyCollection|HashSet)<([\w\d]+)>\??$/;
const collectionRegex = /^(?:I?List|IReadOnlyList|IEnumerable|ICollection|IReadOnlyCollection|HashSet)<(.+)>\??$/;
const simpleDictionaryRegex = /^(?:I?Dictionary|SortedDictionary|IReadOnlyDictionary)<([\w\d]+)\s*,\s*([\w\d]+)>\??$/;
const dictionaryRegex = /^(?:I?Dictionary|SortedDictionary|IReadOnlyDictionary)<([\w\d]+)\s*,\s*(.+)>\??$/;

const defaultTypeTranslations = {
    int: 'number',
    double: 'number',
    float: 'number',
    Int32: 'number',
    Int64: 'number',
    short: 'number',
    long: 'number',
    decimal: 'number',
    bool: 'boolean',
    DateTime: 'string',
    DateTimeOffset: 'string',
    Guid: 'string',
    dynamic: 'any',
    object: 'any',
};

const createConverter = config => {
    console.log('createConverter is called!!!')
    const typeTranslations = Object.assign({}, defaultTypeTranslations, config.customTypeTranslations);

    const convert = json => {
        console.log('convert is called!!!')

        // const declarationRows = flatten(json.map(createFileDeclarations))
        // console.log('declarationRows', declarationRows)
        const declarations = flatten(json.map(createFileDeclarations))
                                .reduce((acc, [typeName, fileName]) => { acc[typeName] = fileName; return acc }, {})
        console.log('declarations', JSON.stringify(declarations))
        console.log('ignoreTypes', config.ignoreTypes)

        const isNotIgnored = type => !config.ignoreTypes.includes(type.ModelName)

        const outputFiles = json.map(file => {
            const filename = path.relative(process.cwd(), file.FileName);
            const dependencies = flatten([
                ...file.Models.filter(isNotIgnored).map(model => listDependencies(model)),
                ...file.Enums.filter(isNotIgnored).map(enum_ => listDependencies(enum_)),
            ]);
            console.log(dependencies)

            const baseTypeTs = config.baseTypeTs ? path.basename(config.baseTypeTs).split('.')[0] : undefined
            console.log('baseTypeTs is', baseTypeTs)

            const includes = dependencies
                .filter(dependency => declarations[dependency] || baseTypeTs)
                .map(dependency => `import { ${dependency} } from "./${declarations[dependency] ? (declarations[dependency]) : baseTypeTs }";`)

            const rows = flatten([
                ...includes,
                config.namespace ? `namespace ${config.namespace} {` : '',
                ...file.Models.filter(isNotIgnored).map(model => convertModel(model, filename)),
                ...file.Enums.filter(isNotIgnored).map(enum_ => convertEnum(enum_, filename)),
                config.namespace ? '}' : '',
            ]).filter(x => x);

            const content = rows
                .map(row => config.namespace ? `    ${row}` : row)
                .join('\n')

            console.log(rows)
            return { file: file,
                content: content }
        });

        /* const filteredContent = content.filter(x => x.length > 0);

        if (config.namespace) {
            return [
                `declare module ${config.namespace} {`,
                ...filteredContent,
                '}',
            ].join('\n');
        } else {
            return filteredContent.join('\n');
        } */
        return outputFiles
    };

    const createFileDeclarations = (file) => {
        const shortFileName = path.basename(file.FileName).split('.')[0]

        const declarations = [
            ...file.Models.map(model => [model.ModelName, shortFileName]),
            ...file.Enums.map(enum_ => [enum_.EnumName, shortFileName]),
        ];
        return declarations
    }
    const listDependencies = (model) => {
        const dependencies = [];

        if (model.BaseClasses) {
            dependencies.push(...model.BaseClasses);
        }

        if (model.Fields) {
            dependencies.push(...model.Fields.map(field => field.Type));
        }

        if (model.Properties) {
            dependencies.push(...model.Properties.map(property => property.Type));
        }

        const jsTypes = ['string', 'number', 'boolean', 'any']
        return dependencies
            .map(type => /\?$/.test(type) ? type.slice(0, -1) : type)
            .filter(type => !defaultTypeTranslations[type] && !jsTypes.includes(type));
    }

    const convertModel = (model, filename) => {
        const rows = [];

        if (model.BaseClasses) {
            model.IndexSignature = model.BaseClasses.find(type => type.match(dictionaryRegex));
            model.BaseClasses = model.BaseClasses.filter(type => !type.match(dictionaryRegex));
        }

        const members = [...(model.Fields || []), ...(model.Properties || [])];
        const baseClasses = model.BaseClasses && model.BaseClasses.length ? ` extends ${model.BaseClasses.join(', ')}` : '';

        if (!config.omitFilePathComment) {
            rows.push(`// ${filename}`);
        }
        rows.push(`export interface ${model.ModelName}${baseClasses} {`);

        if (model.IndexSignature) {
            rows.push(`    ${convertIndexType(model.IndexSignature)};`);
        }

        members.forEach(member => {
            rows.push(`    ${convertProperty(member)};`);
        });

        rows.push(`}\n`);

        return rows;
    };

    const convertEnum = (enum_, filename) => {
        const rows = [];
        if (!config.omitFilePathComment) {
            rows.push(`// ${filename}`);
        }

        const entries = Object.entries(enum_.Values);

        const getEnumStringValue = (value) => config.camelCaseEnums
            ? camelcase(value)
            : value;

        if (config.stringLiteralTypesInsteadOfEnums) {
            rows.push(`export type ${enum_.Identifier} =`);

            entries.forEach(([key], i) => {
                const delimiter = (i === entries.length - 1) ? ';' : ' |';
                rows.push(`    '${getEnumStringValue(key)}'${delimiter}`);
            });

            rows.push('');
        } else {
            rows.push(`export enum ${enum_.Identifier} {`);

            entries.forEach(([key, value], i) => {
                if (config.numericEnums) {
                    rows.push(`    ${key} = ${value != null ? value : i},`);
                } else {
                    rows.push(`    ${key} = '${getEnumStringValue(key)}',`);
                }
            });

            rows.push(`}\n`);
        }

        return rows;
    };

    const convertProperty = property => {
        const optional = property.Type.endsWith('?');
        const identifier = convertIdentifier(optional ? `${property.Identifier.split(' ')[0]}?` : property.Identifier.split(' ')[0]);

        const type = parseType(property.Type);

        return `${identifier}: ${type}`;
    };

     const convertIndexType = indexType => {
       const dictionary = indexType.match(dictionaryRegex);
       const simpleDictionary = indexType.match(simpleDictionaryRegex);

       propType = simpleDictionary ? dictionary[2] : parseType(dictionary[2]);

       return `[key: ${convertType(dictionary[1])}]: ${convertType(propType)}`;
     };

    const convertRecord = indexType => {
        const dictionary = indexType.match(dictionaryRegex);
        const simpleDictionary = indexType.match(simpleDictionaryRegex);

        propType = simpleDictionary ? dictionary[2] : parseType(dictionary[2]);

        return `Record<${convertType(dictionary[1])}, ${convertType(propType)}>`;
    };

    const parseType = propType => {
        const array = propType.match(arrayRegex);
        if (array) {
            propType = array[1];
        }

        const collection = propType.match(collectionRegex);
        const dictionary = propType.match(dictionaryRegex);

        let type;

        if (collection) {
            const simpleCollection = propType.match(simpleCollectionRegex);
            propType = simpleCollection ? collection[1] : parseType(collection[1]);
            type = `${convertType(propType)}[]`;
        } else if (dictionary) {
            type = `${convertRecord(propType)}`;
        } else {
            const optional = propType.endsWith('?');
            type = convertType(optional ? propType.slice(0, propType.length - 1) : propType);
        }

        return array ? `${type}[]` : type;
    };

    const convertIdentifier = identifier => config.camelCase ? camelcase(identifier, config.camelCaseOptions) : identifier;
    const convertType = type => type in typeTranslations ? typeTranslations[type] : type;

    return convert;
};

module.exports = createConverter;
