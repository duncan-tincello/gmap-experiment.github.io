/* https://plainjs.com/javascript/events/live-binding-event-handlers-14/ */
// helper for enabling IE 8 event bindings
function addEvent(el, type, handler) {
  if (el.attachEvent) el.attachEvent('on' + type, handler); else el.addEventListener(type, handler);
}

function getAjax(url, success) {
  var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
  xhr.open('GET', url);
  xhr.onreadystatechange = function () {
    if (xhr.readyState > 3 && xhr.status == 200) success(xhr.responseText);
  };
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  xhr.send();
  return xhr;
}

// https://www.html5rocks.com/en/tutorials/cors/
// Create the XHR object.
function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}

var map;
var youAreHereMarker;
var isNotSupported = true;
var locationMarkers = [];
var getCurrentLocation = document.getElementById('current-location');
var mapContainerElem = document.getElementById('map-container');
var mapElem = document.getElementById('map');
var listElem = document.getElementById('list');
var systemErrorElem = document.getElementById('error');
var systemErrorCodeElem = document.getElementById('error-code');
var zeroResultsElem = document.getElementById('not-found');
var locationField = document.getElementById('location');
var template = document.getElementById('template');
var apiKey = '';
var geolocateUrl = 'https://www.googleapis.com/geolocation/v1/geolocate?key=';

var showIsNotSupported = function () {
  document.getElementById('lookup').disabled = true;
  document.getElementById('not-supported').style.display = 'block';
  isNotSupported = true;
};

var getApiKey = createCORSRequest('GET', '/api/map');

if (getApiKey) {
  // Disabled by default so it prevents use if JavaScript is disabled.
  document.getElementById('lookup').disabled = false;
  getCurrentLocation.disabled = false;
} else {
  document.getElementById('not-supported').style.display = 'block';
}

getApiKey.onload = function () {
  isNotSupported = false;
  json = JSON.parse(getApiKey.responseText);
  if (json && json.sets && json.sets.api && json.sets.api.key) {
    geolocateUrl += json.sets.api.key;
  }
};

getApiKey.onerror = function () {
  showIsNotSupported();
};

getApiKey.send();

var showError = function (error, code) {
  systemErrorElem.style.display = 'block';
  if (code) {
    systemErrorCodeElem.innerText = code;
    systemErrorCodeElem.style.display = 'inline';
  }
  mapContainerElem.style.display = 'none';
  mapElem.style.display = 'none';
  listElem.style.display = 'none';
  console.error(error);
};

var hideError = function () {
  systemErrorElem.display = 'none';
  systemErrorCodeElem.innerText = '';
  zeroResultsElem.style.display = 'none';
};

var showZeroResults = function () {
  zeroResultsElem.style.display = 'block';
};

var showMap = function (location) {
  // Only display the map if the visitor uses the search box.
  if (map) {
    map.setCenter(location);
  } else {
    map = new google.maps.Map(mapElem, {
      // Centre the map on the given location.
      center: location,
      // Choose zoom level for best visitor experience.
      zoom: 9
    });
  }

  var youAreHere = {
    path: 'M -8,0 0,-8 8,0 0,8 z',
    strokeColor: '#00d1b2',
    strokeWeight: 3
  };

  // Show a small marker to confirm their search result.
  if (youAreHereMarker) {
    youAreHereMarker.setMap(null);
  }
  youAreHereMarker = new google.maps.Marker({
    position: location,
    icon: youAreHere,
    map: map
  });

  for (var i = 0; i < locationMarkers.length; i += 1) {
    locationMarkers[i].setMap(null);
  }
  locationMarkers = [];

  mapContainerElem.style.display = 'flex';
  mapElem.style.display = 'flex';
  listElem.style.display = 'flex';

  // Fetch the nearest stores.
  var storesNearUrl = '/api/locations?lat=';
  storesNearUrl += location.lat;
  storesNearUrl += '&lng=';
  storesNearUrl += location.lng;

  getAjax(storesNearUrl, function (data) {
    var json,
      headingElem, distanceElem, addressElem, notesElem, storeElem,
      fragment, children, newMarker;

  try {
      json = JSON.parse(data);
      if (!json || !json.status) {
        throw new Error('API status not found');
      }
      if (json.status !== 'ok') {
        throw new Error('API status error: ' + json.status);
      }
      if (!json.sets) {
        throw new Error('API sets not found');
      }
      if (!json.sets.markers || !json.sets.markers.length) {
        throw new Error('API markers not found');
      }

      // Remove old location labels first.
      while (listElem.firstChild) {
        // Thanks to https://stackoverflow.com/a/3955238
        listElem.removeChild(listElem.lastChild);
      }

      for (i = 0; i < json.sets.markers.length; i += 1) {

        // Polyfill for HTML template tag, with thanks to
        // https://stackoverflow.com/a/33138997
        if('content' in document.createElement('template')) {
          storeElem = document.importNode(template.content, true);
        } else {
          fragment = document.createDocumentFragment();
          children = template.childNodes;
          for (i = 0; i < children.length; i += 1) {
              fragment.appendChild(children[i].cloneNode(true));
          }
          storeElem = fragment;
        }

        listElem.appendChild(storeElem);

        countElem = document.getElementById('n');
        if (countElem) {
          countElem.innerText = (i + 1);
          countElem.id = 'n' + (i + 1);
        }

        headingElem = document.getElementById('heading');
        if (headingElem && json.sets.markers[i].heading) {
          headingElem.innerText = json.sets.markers[i].heading;
          headingElem.id = 'heading' + (i + 1);
        }

        distanceElem = document.getElementById('distance');
        if (distanceElem && json.sets.markers[i].distance) {
          distanceElem.innerText = json.sets.markers[i].distance;
          distanceElem.id = 'distance' + (i + 1);
        }

        addressElem = document.getElementById('address');
        if (addressElem && json.sets.markers[i].address) {
          addressElem.innerText = json.sets.markers[i].address;
          addressElem.id = 'address' + (i + 1);
        }

        notesElem = document.getElementById('notes');
        if (notesElem && json.sets.markers[i].notes) {
          notesElem.innerText = json.sets.markers[i].notes;
          notesElem.id = 'notes' + (i + 1);
        }

        // https://developers.google.com/maps/documentation/javascript/markers
        newMarker = new google.maps.Marker({
          position: {
            lat: parseFloat(json.sets.markers[i].latitude),
            lng: parseFloat(json.sets.markers[i].longitude)
          },
          map: map,
          title: json.sets.markers[i].heading,
          label: (i + 1).toString()
        });

        locationMarkers.push(newMarker);
      }

    } catch (error) {
      showError(error);
    }

  });

};

// Google Maps calls this when it has loaded.
var initMap = function () {

  // Use client side geocoding API:
  // https://developers.google.com/maps/documentation/javascript/geocoding
  var geocoder = new google.maps.Geocoder();

  // Geolocation - where am I?
  addEvent(getCurrentLocation, 'click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    hideError();

    if (isNotSupported) {
      return;
    }

    // https://developers.google.com/maps/documentation/geolocation/intro
    var locationXhr = createCORSRequest('POST', geolocateUrl);

    locationXhr.onload = function () {
      try {
        if (!locationXhr.responseText) {
          throw new Error('no xhr.responseText');
        }

        var json = JSON.parse(locationXhr.responseText);
        if (!json.location || !json.location.lat || !json.location.lng) {
          throw new Error('No coordinates');
        }

        showMap(json.location);

      } catch (error) {
        showError('Unable to determine your current location');
      }
    };

    locationXhr.onerror = function () {
      showError('Unable to determine your current location');
    };

    locationXhr.send();
  });

  // Geocoding - where is the given location?
  addEvent(document.getElementById('getlocation'), 'submit', function (event) {
    var request = {};

    event.preventDefault();
    event.stopPropagation();

    if (locationField.value.length < 1) {
      return;
    }

    // Tidy up any prior error message.
    hideError();

    request.address = locationField.value;

    // Search the UK region (ISO 3166-1 code).
    // https://developers.google.com/maps/documentation/geocoding/intro#RegionCodes
    request.region = 'gb';

    // https://developers.google.com/maps/documentation/geocoding/intro#ComponentFiltering
    request.componentRestrictions = { country: 'GB' }

    geocoder.geocode( request, function(results, status) {
      try {
        if (status == 'OK') {

          // Keep it simple and use only the first result if more than one.
          showMap(results[0].geometry.location);

        } else if (status === 'ZERO_RESULTS') {
          throw new Error('Zero results');
        } else {
          var newError = new Error('server error: ' + status);
          newError.status = status;
          throw newError
        }
      } catch (error) {
        if (error.message == 'Zero results') {
          showZeroResults();
        } else if (error.status) {
          showError(error, error.status);
        } else {
          showError(error);
        }
      }
    });

  });

}
