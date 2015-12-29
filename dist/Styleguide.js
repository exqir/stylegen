"use strict";
var path = require('path');
var denodeify = require('denodeify');
var fs = require('fs-extra');
var Logger_1 = require('./Logger');
var Config_1 = require('./Config');
var StructureReader_1 = require('./StructureReader');
var StructureWriter_1 = require('./StructureWriter');
var ComponentList_1 = require('./ComponentList');
var Doc_1 = require('./Doc');
var Partial_1 = require('./Partial');
var View_1 = require('./View');
var MarkdownRenderer_1 = require('./MarkdownRenderer');
var HandlebarsRenderer_1 = require('./HandlebarsRenderer');
var fsensuredir = denodeify(fs.ensureDir);
var fscopy = denodeify(fs.copy);
var outputfile = denodeify(fs.outputFile);
var flatten = (list) => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
class Styleguide {
    // public docFactory: DocFactory;
    constructor(options) {
        this.options = options;
        // nodes build the structure of our styleguide
        this.nodes = [];
        this.components = new ComponentList_1.ComponentList();
    }
    /*
     * Styleguide setup method to collect and merge configurations,
     * to set defaults and allow to overwrite them in the styleguide.json
     */
    initialize(cwd, stylegenRoot) {
        return new Promise((resolve, reject) => {
            var configPath;
            if (!stylegenRoot) {
                stylegenRoot = path.resolve(__dirname, '..');
            }
            if (!!this.options && !!this.options.configPath) {
                configPath = this.options.configPath;
            }
            else {
                var jsonConfig = path.resolve(cwd, 'styleguide.json');
                var yamlConfig = path.resolve(cwd, 'styleguide.yaml');
                var stat;
                try {
                    stat = fs.statSync(jsonConfig);
                }
                catch (e) { }
                configPath = !!stat ? jsonConfig : yamlConfig;
            }
            var configurations = [configPath, path.resolve(stylegenRoot, 'styleguide-defaults.yaml')];
            if (!!this.options) {
                configurations.unshift(this.options);
            }
            /**
             * retrieve the config and bootstrap the styleguide object.
             */
            return new Config_1.Config()
                .load(...configurations)
                .then((mergedConfig) => {
                this.config = mergedConfig;
                /** lets assure, that we have the current working directory in reach for later access */
                this.config.cwd = cwd;
                /** we sometimes need the stylegen root, e.g. for file resolvement */
                this.config.stylegenRoot = stylegenRoot;
                this.config.componentPaths.push(path.resolve(stylegenRoot, "styleguide-components"));
                this.config.target = path.resolve(cwd, this.config.target);
                /** each and every styleguide should have a name ;) */
                if (!this.config.name) {
                    this.config.name = path.basename(this.config.cwd);
                }
                if (!this.config.version) {
                    this.config.version = '0.0.1';
                }
                var rendererConfig = {};
                rendererConfig.namespace = this.config.namespace;
                if (this.config.partials) {
                    rendererConfig.partialLibs = this.config.partials.map(p => {
                        try {
                            var partialLibPath = path.resolve(this.config.cwd, p);
                            if (fs.statSync(partialLibPath)) {
                                return require(partialLibPath);
                            }
                        }
                        catch (e) {
                            Logger_1.warn("Styleguide.initialize", "not existing partial lib referenced");
                            return null;
                        }
                    });
                }
                this.htmlRenderer = new HandlebarsRenderer_1.HandlebarsRenderer(rendererConfig);
                this.docRenderer = new MarkdownRenderer_1.MarkdownRenderer({ "htmlEngine": this.htmlRenderer });
                Doc_1.Doc.setRenderer(this.docRenderer);
                Partial_1.Partial.setRenderer(this.htmlRenderer);
                View_1.View.setRenderer(this.htmlRenderer);
                resolve(this);
            })
                .catch(function (e) {
                Logger_1.error("Styleguide.initialize:", e.message);
                console.log(e.stack);
                reject(e);
            });
        });
    }
    /*
     * walk the configured styleguide folders and read in the several components, pages, navigation, etc.,
     * and store the information inside the styleguide properties.
     */
    read() {
        /**
         * While this.nodes should represent our styleguide tree strucute, it is empty yet,
         * so lets start to fill it.
         *
         * A successful collect promise just resolves to `this`, so that we are able
         * to proceed with the information we collected in the read step.
         */
        return new StructureReader_1.StructureReader(this)
            .collect()
            .then((reader) => {
            return this;
        });
    }
    /*
     * write down, what was read, so make sure you read before :)
     */
    write() {
        return new StructureWriter_1.StructureWriter(this.renderer, this.nodes, this)
            .setup()
            .then((structureWriter) => {
            Logger_1.success("Styleguide.write", "writer setup finished");
            return structureWriter.write();
        })
            .then((result) => this);
    }
    /*
     * write down, what was read, so make sure you read before :)
     */
    export() {
        Logger_1.success("Styleguide.export", "creating export ....");
        // TODO: move to Partial export function
        var partials = this.components.all()
            .filter((c) => c.config.namespace === this.config.namespace)
            .filter((c) => c.partials.length > 0)
            .map(c => c.partials.map(p => p.registerable));
        partials = flatten(partials);
        var partialsTemplate = `exports.partials = function(engine, atob){
      ${partials.join("\n")}
    };`;
        return outputfile(path.resolve('.', 'partials.js'), partialsTemplate)
            .then(() => {
            return Promise.resolve(this);
        });
    }
    /*
     * write down, what was read, so make sure you read before :)
     */
    prepare() {
        return fsensuredir(path.resolve(this.config.cwd, this.config.target, 'assets'))
            .then(() => {
            return fscopy(path.resolve(this.config.stylegenRoot, 'styleguide-assets'), 
            // TODO: make "assets" path configurable
            path.resolve(this.config.cwd, this.config.target, 'stylegen-assets'));
        })
            .then(() => {
            if (!!this.config.assets) {
                var copyPromises = this.config.assets.map((asset) => {
                    return fscopy(path.resolve(this.config.cwd, asset.src), path.resolve(this.config.cwd, this.config.target, asset.target));
                });
                return Promise.all(copyPromises);
            }
            else {
                Logger_1.warn("Styleguide.prepare", "No additional assets configured");
                return Promise.resolve([]);
            }
        })
            .then(() => {
            return this;
        });
    }
}
exports.Styleguide = Styleguide;