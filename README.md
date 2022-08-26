# js-casprop

JavaScript-CascadingProperties

## Description

js-casprop is an extended css-parser that can be used to set js object properties based on other properties.

Initially this was used for styling inside of a custom webGl renderer. 

## Example

This is an example .jscp file:

```
e {
     shape: 1;
     size: 10;
     color: 0x66ff66ff;
     layer: 0;
     border: 0x00000000;
}

e[type=class] {
     shape: 1;
     color: 0x66ff66ff;
     size: lin(100=12, 400=18, 900=26).using(loc);
}
```

The first character identifies the objects 'class' and needs to be defined in the queried object q.class='e'.
Due to the initial requirements currently only 'e' (entity) and 'l' (link) are supported.

```[type=class]``` is the js object selector. the corresponding rule will be applied if the selector matches the object. 
In this case the queried object q needs to look like this:

```
{
     'type':'class'
}
```

All Properties in the body of a rule describe what is going to be written into the target property object o. Hex and RGB(A) Values will be transformed to an 32-bit integer usable by the shader. (**this is currently bugged, the mapping might not be entirely correct - this can be fixed in the shader**)

```size: lin(100=12, 400=18, 900=26).using(loc);``` describes a linear interpolation of the size value written to the target object dependent on the queried object 'loc' value. 

## Getting Started

### Installing

**this is not yet available**
```
npm install js-casprop
```

### Usage

* Create an instance

```
const js-casprop = new JsCasProp.JsCasProp();
```
* Configure the instance using the constructor parameter
```
const js-casprop = new new JsCasProp.JsCasProp({
            classProperty: 'class', // the property of the queried object storing the object class identifying a group of similar objects
            tagListSeparator: ' ', // seperator for a "tag" field inside the queried object which contains a list of separate tags
            events: Events.explorerEvent, // object containing all events that are usable with e.g. the e:onclick selector
        });
```

* Parse your .jscp file
```
js-casprop.parse(file);
```

* Query object q and apply all matching rules to object o
```
js-casprop.style(q, o); // The name of this method will be adjusted in the future.
```

### How to build

After first clone run

```
npm install
```

and build with

```
npm run build
```

or without minimization

```
npm run dev
```

## Authors

[mrcdnk](https://github.com/mrcdnk)  

## Version History

* 0.4.0
    * allow custom configuration of event object
    * rename from ExpCss to js-casprop
* 0.3.3 *will be filled in later*    

## License

This project is licensed under the CC-BY-4.0 License - see the LICENSE.md file for details

## Acknowledgments

[jotform-css.js](https://github.com/jotform/css.js)