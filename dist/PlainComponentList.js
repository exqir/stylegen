"use strict";
var path = require('path');
var denodeify = require('denodeify');
var fs = require('fs-extra');
var fsoutputfile = denodeify(fs.outputFile);
/**
 * describes an app.component that has been wrapped in the component view,
 * and holds a reference to the Component itself and the compiled output.
 */
class PlainComponentList {
    constructor(styleguide) {
        this.styleguide = styleguide;
    }
    /**
     * view component building is the process of wrapping
     * a component inside the styleguides component view,
     * so that we may render it inside a component listing,
     * with the meta information etc. displayed as well,
     * as the compiled component view itself.
     */
    buildViewComponent(component) {
        var viewComponent = {
            component: component
        };
        /**
         * If the component has a view, we will render it to the list of components.
         * In case it has no view, we will not display the component for now.
         */
        if (!!component.view && !!component.view.template) {
            /** build the render context for the current component */
            var context = {
                id: component.slug,
                headline: component.config.label || component.id,
                template: component.view.template(component.config.viewContext || {}),
                docs: component.docs.map(d => {
                    return { "label": d.name, "content": d.compiled };
                }),
                component: component
            };
            /** lookup the styleguide component template */
            // TODO: handle/secure this law of demeter disaster :D
            var compTemplate = this.styleguide.components.find('sg.component').view.template;
            /** build the representation of the current component for the styleguide */
            viewComponent.compiled = compTemplate(context);
            return viewComponent;
        }
        else {
            return null;
        }
    }
    intersect(array1, array2) {
        if (!array1 || !array2) {
            return [];
        }
        return array1.filter((a) => array2.indexOf(a) != -1);
    }
    build(config) {
        config = config || {};
        return new Promise((resolve, reject) => {
            var context = Object.assign({}, config);
            try {
                /** get all all components, registered in the styleguide */
                var components = this.styleguide.components.all(config.components);
                if (!!config.tags) {
                    components = components.filter((c) => this.intersect(c.tags, config.tags).length == config.tags.length);
                }
                var componentViews = components
                    .filter((c) => c.config.namespace === this.styleguide.config.namespace)
                    .map((c) => this.buildViewComponent(c))
                    .filter((c) => c !== null);
                /** set context for rendering the component list */
                context.components = componentViews;
            }
            catch (e) {
                /** if some of the above fails, go to hell!! :) */
                reject(e);
            }
            // TODO: handle/secure this law of demeter disaster :D
            var compListTemplate = this.styleguide.components.find('sg.plain-list-layout').view.template;
            /** shorthand to the styleguide config */
            this.compiled = compListTemplate(context);
            resolve(this);
        });
    }
    /**
     * the most basic writer, that handles the resolution of how to
     * integrated the rendered component views in the target file structure.
     */
    write(layoutContext) {
        return new Promise((resolve, reject) => {
            var config = this.styleguide.config;
            var layout = this.styleguide.components.find('sg.layout').view.template;
            layoutContext = Object.assign({}, layoutContext, { content: this.compiled });
            return fsoutputfile(path.resolve(config.cwd, config.target, "components.html"), layout(layoutContext))
                .then(() => resolve(this))
                .catch((e) => reject(e));
        });
    }
}
exports.PlainComponentList = PlainComponentList;