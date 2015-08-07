/* angular-kencale.js / (c) 2015 Elad Efrat / MIT Licence */
(function () {
'use strict';

angular.module('angularKencale', [
  'ngSanitize',
  'pascalprecht.translate',
  'angularLoad'
])
.provider('$locale', function ($translateProvider) {
  $translateProvider.useSanitizeValueStrategy('escape');

  var defaultLocaleId;
  var currentLocaleId;
  var availableLocales = {};
  var setLocaleCallback;
  var loadedScripts = []; // Note: Will be obsolete by angular-load > 0.2.0

  function loadLocale(localeId, localeData) {
    var locale = availableLocales[localeId];
    if (!locale) {
      locale = availableLocales[localeId] = {
        name: null,
        rtl: false,
        scripts: [],
        css: []
      };
    }

    locale.name = locale.name || localeData.name;
    locale.rtl = locale.rtl || !!localeData.rtl;

    if (localeData.scripts) {
      localeData.scripts.forEach(function (script) {
        if (locale.scripts.indexOf(script) === -1) {
          locale.scripts.push(script);
        }
      });
    }

    if (localeData.css) {
      localeData.css.forEach(function (css) {
        if (locale.css.indexOf(css) === -1) {
          locale.css.push(css);
        }        
      });
    }

    $translateProvider.translations(localeId, localeData.translations);

    return this;
  }

  // Provider API, available only during configuration phase.
  var providerAPI = {
    setDefaultLocale: setDefaultLocale,
    loadLocale: loadLocale,

    $get: getInstance    
  };

  function setDefaultLocale(localeId) {
    defaultLocaleId = localeId || defaultLocaleId;

    return this;
  }

  return providerAPI;
  
  // Factory for the locale service, available during run phase.
  function getInstance($rootScope, $translate, angularLoad, $q) {
    function loadScript(script) {
      var d = $q.defer();

      angularLoad.loadScript(script).then(function () {
        loadedScripts.push(script);
        
        d.resolve();
      }).catch(function() {
        console.error('Failed to load locale script, localeId: %s, script: %s', localeId, script);
        d.resolve();
      });

      return d.promise;
    }

    function findCSS(callback) {
      var cssElements = document.getElementsByTagName('link');
      for (var i = 0, _len = cssElements.length; i < _len; i++) {
        if (callback(cssElements[i])) {
          return true;
        }
      }

      return false;
    }

    function loadExternal(localeId) {
      var localeInfo = availableLocales[localeId];

      // Scripts
      $q.all(localeInfo.scripts.
        filter(function (script) {
          return (loadedScripts.indexOf(script) === -1);
        }).
        map(angularLoad.loadScript)).
      then(function (results) {
        results.forEach(function (e) {
          var script = e.path[0].attributes.src.value;
          loadedScripts.push(script);
        });
      }).
      finally(function (results) {
        setLocaleCallback && setLocaleCallback(localeId);
      });

      // CSS
      localeInfo.css.forEach(function (css) {
        var alreadyLoaded = findCSS(function (cssElement) {
          // If this CSS has already been loaded, make sure it's enabled.
          if (css === cssElement.attributes.href.value) {
            cssElement.disabled = false;
            return true;
          }
        });
        if (!alreadyLoaded) {
          angularLoad.loadCSS(css);
        }
      })
    }

    function unloadExternal(localeId) {
      if (!localeId) {
        return;
      }

      var localeInfo = availableLocales[localeId];

      // CSS
      findCSS(function (cssElement) {
        // If this CSS is to be removed, disable it.
        if (localeInfo.css.indexOf(cssElement.attributes.href.value) !== -1) {
          cssElement.disabled = true;
        }
      });
    }

    // Always set a locale before creating the service.
    setLocale(defaultLocaleId);

    var serviceAPI = {
      availableLocales: availableLocales,
      setLocale: setLocale,
      onSetLocale: onSetLocale,
      id: defaultLocaleId,
      isRTL: isRTL
    };

    return serviceAPI;

    // Public API
    function isRTL(localeId) {
      localeId = localeId || $rootScope.localeId;
      return !!availableLocales[localeId].rtl;
    };

    function setLocale(localeId) {
      if (!localeId) {
        return;
      }

      if (localeId === currentLocaleId) {
        return this;
      }
      var previousLocaleId = currentLocaleId;
      currentLocaleId = localeId;

      $translate.use(localeId);

      unloadExternal(previousLocaleId)
      loadExternal(localeId);

      // Cache for easy access from views and controllers.
      if (serviceAPI) {
        serviceAPI.id = localeId;
      }
      $rootScope.isRTL = isRTL(localeId);

      return this;
    }

    function onSetLocale(callback) {
      setLocaleCallback = callback;
    }
  }
});
})();