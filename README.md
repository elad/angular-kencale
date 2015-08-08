# angular-kencale

`angular-kencale` is an Angular provider that's supposed to help you with i18n and l10n in web apps. It relies on [angular-translate](https://github.com/angular-translate/angular-translate) for translations and [angular-load](https://github.com/urish/angular-load) for conditionally loading scripts and CSS.

For now, read this:

```js
// This example uses angular-moment to demonstrate use of a
// locale-specific plugin. It's not a dependency of angular-kencale.

angular.module('myApp', [
  'angularKencale',
  'angularMoment'
])
.config(function ($localeProvider) {
  // $localeProvider can be used in the configuration phase of
  // your modules to load locale-specific translations, scripts,
  // and CSS, and set a default locale.
  //
  // Any 'translations' specified are passed directly to
  // angular-translate's translations() function.
  //
  // Any 'scripts' and 'css' specified will be loaded when
  // switching to the locale they're part of. This is for locale
  // plugins (like in moment.js) and/or RTL-ized CSS (like in
  // bootstrap-rtl). Locale-specific CSS will be unloaded
  // (disabled) when changing locale.
  $localeProvider.
    loadLocale('en-us', {
      name: 'English',
      translations: {
        hello: 'Hello'
      }
    }).
    loadLocale('he-il', {
      name: 'עברית',
      rtl: true,
      scripts: [
        'bower_components/moment/locale/he.js'
      ],
      css: [
        'bower_components/bootstrap-rtl/dist/css/bootstrap-rtl.css'
      ],
      translations: {
        hello: 'שלום'
      }
    }).
    setDefaultLocale('he-il');

  // It's okay to call loadLocale() multiple times and from different
  // modules. Also, the 'name' and 'rtl' properties are sticky, so
  // it's okay to specify them only once.
  $localeProvider.
    loadLocale('en-us', {
      translations: {
        world: 'World'
      }
    }).
    loadLocale('he-il', {
      translations: {
        world: 'עולם'
      }
    });
    
  // If your translations are in other files, you can pass a URL
  // instead of actual translations. Both a single URL as a string
  // or multiple URLs as an array are fine.
  $localeProvider.
    loadLocale('en-us', {
  	  translations: 'en-us.json'
    }).
    loadLocale('he-il', {
  	  translations: 'he-il.json'
    });

  // If your URLs have a pattern, you could use a template. Just
  // pass a string (or an array, for multiple templates) instead.
  $localeProvider.loadLocale([
    'foo.{localeId}.json',
    'bar.{localeId}.json'
  ]);
})
.run(function ($locale, amMoment) {
  // The $locale service is available in the run phase.  You can set a
  // callback function to be called whenever the locale is changed.
  // It is guaranteed to be called only after all scripts associated
  // with the locale have finished loading.
  $locale.onSetLocale(function (localeId) {
    amMoment.changeLocale(localeId);
  });

  // And, of course, you can switch between locales using setLocale().
  $locale.setLocale('en-us');
});
```
