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
var isNotSupported = false;
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
var geolocateUrl = 'https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyCcoolkoC4aNF--lE0PezMkiZ2zMTekVJU';

var showIsNotSupported = function () {
  document.getElementById('lookup').disabled = true;
  document.getElementById('not-supported').style.display = 'block';
  isNotSupported = true;
};

var showError = function (error, code) {
  systemErrorElem.style.display = 'block';
  if (code) {
    systemErrorCodeElem.innerText = code;
    systemErrorCodeElem.style.display = 'inline';
  }
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

  var markers = [
    {
      heading: 'BATH',
      latitude: 51.3798438,
      longitude: -2.3591648
    },
    {
      heading: 'YEOVIL',
      latitude: 50.9415691,
      longitude: -2.6313743
    },
  ];

  var headingElem, distanceElem, addressElem, notesElem, storeElem, fragment, children, newMarker;

  try {
    // Remove old location labels first.
    while (listElem.firstChild) {
      // Thanks to https://stackoverflow.com/a/3955238
      listElem.removeChild(listElem.lastChild);
    }

    for (i = 0; i < markers.length; i += 1) {

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
      if (headingElem && markers[i].heading) {
        headingElem.innerText = markers[i].heading;
        headingElem.id = 'heading' + (i + 1);
      }

      distanceElem = document.getElementById('distance');
      if (distanceElem && markers[i].distance) {
        distanceElem.innerText = markers[i].distance;
        distanceElem.id = 'distance' + (i + 1);
      }

      addressElem = document.getElementById('address');
      if (addressElem && markers[i].address) {
        addressElem.innerText = markers[i].address;
        addressElem.id = 'address' + (i + 1);
      }

      notesElem = document.getElementById('notes');
      if (notesElem && markers[i].notes) {
        notesElem.innerText = markers[i].notes;
        notesElem.id = 'notes' + (i + 1);
      }

      // https://developers.google.com/maps/documentation/javascript/markers
      newMarker = new google.maps.Marker({
        position: {
          lat: parseFloat(markers[i].latitude),
          lng: parseFloat(markers[i].longitude)
        },
        map: map,
        title: markers[i].heading,
        label: (i + 1).toString()
      });

      locationMarkers.push(newMarker);
    }

  } catch (error) {
    showError(error);
  }
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
