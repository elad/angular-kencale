/* angular-kencale.js / (c) 2015 Elad Efrat / MIT Licence */
(function () {
'use strict';

angular.module('angularKencale', [
  'ngSanitize',
  'pascalprecht.translate',
  'angularLoad'
])
.provider('$locale', function ($translateProvider) {
  var defaultLocaleId;
  var currentLocaleId;
  var availableLocales = {};
  var setLocaleCallback;
  var loaderUrls = {};
  var loaderTemplateUrls = [];

  $translateProvider.useSanitizeValueStrategy('escape');

  // Set up a custom (async) loader and force its use. This lets us have
  // both inlined translations (standard objects) but also external URLs.
  $translateProvider.forceAsyncReload(true);
  $translateProvider.useLoader('kencaleLoader', {
    urls: loaderUrls,
    templateUrls: loaderTemplateUrls
  });

  function loadLocale(localeId, localeData) {
    // If we have only one argument, it's a template URL with translations.
    if (localeId && !localeData) {
      var urls = angular.isString(localeId) ? [localeId] : localeId;
      loaderTemplateUrls.push.apply(loaderTemplateUrls, urls);
      return this;
    }

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

    // If 'translations' is a string (or an array), then it's a list
    // of URLs with translations to be loaded. Otherwise, it's a
    // standard translations object and we pass it directly.
    var translations = angular.isString(localeData.translations) ? [localeData.translations] : localeData.translations;
    if (angular.isArray(translations)) {
      var localeUrls = loaderUrls[localeId];
      if (!localeUrls) {
        localeUrls = loaderUrls[localeId] = [];
      }
      localeUrls.push.apply(localeUrls, translations);
    } else {
      $translateProvider.translations(localeId, translations);
    }

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
        map(angularLoad.loadScript)).
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

    // Public API
    function isRTL(localeId) {
      localeId = localeId || currentLocaleId;
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
      onSetLocale && onSetLocale(localeId);
      $rootScope.isRTL = isRTL(localeId);

      return this;
    }

    function onSetLocale(callback) {
      setLocaleCallback = callback;
    }

    return serviceAPI;
  }
}).
// Simplified copy of https://github.com/angular-translate/bower-angular-translate-loader-static-files
factory('kencaleLoader', function ($q, $http) {
  return function (options) {
    if (!options || !options.urls || !angular.isObject(options.urls)) {
      throw new Error('No URLs specified for loading');
    }

    var load = function (url) {
      if (!url) {
        throw new Error('No URL specified for loading');
      }

      var deferred = $q.defer();

      $http(angular.extend({
        url: url,
        method: 'GET',
        params: ''
      }, options.$http)).success(function (data) {
        deferred.resolve(data);
      }).error(function () {
        deferred.reject(options.key);
      });

      return deferred.promise;
    };

    var deferred = $q.defer(),
        promises = [],
        urls = options.urls[options.key] || [];

    // Append any template URLs.
    if (options.templateUrls) {
      urls = urls.concat(options.templateUrls);
    }

    var length = urls.length;

    urls.forEach(function (url) {
      promises.push(load(url.replace('{localeId}', options.key)));
    });

    $q.all(promises).then(function (data) {
      var length = data.length,
          mergedData = {};

      for (var i = 0; i < length; i++) {
        for (var key in data[i]) {
          mergedData[key] = data[i][key];
        }
      }

      deferred.resolve(mergedData);
    }, function (data) {
      deferred.reject(data);
    });

    return deferred.promise;
  };
});
})();