using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using Ganss.IO;

namespace CSharpModelsToJson
{
    class File
    {
        public string FileName { get; set; }
        public IEnumerable<Model> Models { get; set; }
        public IEnumerable<Enum> Enums { get; set; }
    }

    /// Test this program by command:
    /// dotnet run --project csharp-models-to-json csconfig.json
    class Program
    {
        static void Main(string[] args)
        {
            IConfiguration config = new ConfigurationBuilder()
                // Houcheng added this line to make it work in DOS command
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile(args[0], true, true)
                .Build();

            // Console.WriteLine("exists: {0}", System.IO.File.Exists(args[0]));
            List<string> includes = new List<string>();
            List<string> excludes = new List<string>();

            config.Bind("include", includes);
            config.Bind("exclude", excludes);

//             Console.WriteLine("Hello World args: {0}", args[0]);
//             Console.WriteLine("Hello World GetCurrentDirectory: {0}", Directory.GetCurrentDirectory());
//             Console.WriteLine("Hello World includes Count: {0}", includes.Count);
            List<File> files = new List<File>();

            foreach (string fileName in getFileNames(includes, excludes)) {
                files.Add(parseFile(fileName));
            }

            string json = JsonConvert.SerializeObject(files);
            System.Console.WriteLine(json);
        }

        static List<string> getFileNames(List<string> includes, List<string> excludes) {
            List<string> fileNames = new List<string>();

            foreach (var path in expandGlobPatterns(includes)) {
                fileNames.Add(path);
            }

            foreach (var path in expandGlobPatterns(excludes)) {
                fileNames.Remove(path);
            }

            return fileNames;
        }

        static List<string> expandGlobPatterns(List<string> globPatterns) {
            List<string> fileNames = new List<string>();

            foreach (string pattern in globPatterns) {
                var paths = Glob.Expand(pattern);

                foreach (var path in paths) {
                    fileNames.Add(path.FullName);
                }
            }

            return fileNames;
        }

        static File parseFile(string path) {
            string source = System.IO.File.ReadAllText(path);
            SyntaxTree tree = CSharpSyntaxTree.ParseText(source);
            var root = (CompilationUnitSyntax) tree.GetRoot();

            var modelCollector = new ModelCollector();
            var enumCollector = new EnumCollector();

            modelCollector.Visit(root);
            enumCollector.Visit(root);

            return new File() {
                FileName = System.IO.Path.GetFullPath(path),
                Models = modelCollector.Models,
                Enums = enumCollector.Enums
            };
        }
    }
}
