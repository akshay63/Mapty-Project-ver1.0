'use strict';

// let map, mapEvent;

//----------- Application Data ------------//
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Parent Class: Workout
//NOTE: WE WILL NEVER DIRECTLY CALL WORKOUT INSTEAD WE WILL EITHER CREATE RUNNING OR CYCLING OBJECT(CLASS)
class Workout {
  //Public instance properties(CLASS FIELDS)
  date = new Date();

  //NOTE/LEARNING: EVERY OBJECT SHOULD HAVE SOME KIND OF UNIQUE ID SO THAT WE CAN LATER IDENTIFY IT AS ID. AND WE SHOULD NEVER CREATE ID ON OUR OWN INSTEAD WE CAN DELEGATE THAT WORK TO THIRD PARTY LIBRARIES
  id = (Date.now() + '').slice(-10); //LEARNING: slice will sliced out last 10 digits of date object

  //LEARNING: We can see how API works - how data is communicated through classes / objects / code[NOTE: JUST FOR KNOWLEDGE, NOT RELATED TO APP]
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on  ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++; //every workouts object will have this method and see no. of clicks happened
  }
}

// Child Class: Running
class Running extends Workout {
  type = 'running'; //public field instance available on all instances of objects
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  //calculating pace = min/km
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Child Class: Cycling
class Cycling extends Workout {
  type = 'cycling'; //public field instance available on all instances of objects
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  //calculating speed = km/h
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/**
 * Experimenting with newly created Workout and Running and Cycling classes
 * const running1 = new Running([12, 41], 10, 20);
   const cycling1 = new Cycling([20, 40], 20, 50);
   console.log(running1);
   console.log(cycling1);
 */

////////////////////////////////////////////////////////////////

//------------ Application Logic ------------//
class App {
  //Private instance properties(CLASS FIELDS)
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    //get current position
    this._getPosition();

    //9. get localStorage

    this._getLocalStorage();

    //LEARNING: We have to manually bind the this keyword everytime when we call a eventHandler bcz it doesn't have this keyword
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    //LEARNING: Event Delegation and nice feature to move marker when we click on the workouts li items
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  //Reeeive position event: Getting current postion and passing it to loadMap to load the map
  _getPosition() {
    //LEARNING: Using Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get the location');
        }
      );
    }
  }

  _loadMap(position) {
    //console.log(position);

    //const latitude = position.coords.latitude;
    const { latitude } = position.coords; //LEARNING: using Destructuring to get the latitude property based on the coorde object.
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`); //Using coords of our current location we can see our location using google maps for ex

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    console.log(this.#map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Click event on the map: Shows the form
    this.#map.on('click', this._showForm.bind(this));

    // Adding markers async when we use localStorage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  //Click event on the map: Shows the form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //7. Hides the form
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //Change input event: Toggle the field of a form
  _toggleElevationField() {
    //LEARNING: changing the value of Cadence input to Elevation Gain input by listening to select element's event triggering
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); //LEARNING: closest(): selects the closest parent of selected element
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //Submit event: Submits the form and creates new objects
  _newWorkout(e) {
    //3. LEARNING: Helper Function(Helpful for Complex conditions): conditions to check the data is a Number❌
    const validInputs = (...inputs) => {
      //LEARNING: The (...inputs) rest parameters then we get an array
      inputs.every(inp => Number.isFinite(inp));
      //LEARNING: the every method will only return true only if the condition inside is returns TRUE for all of them. This means that if one of them is false then it will return FALSE
    };

    //3. Helper Function(Helpful for Complex conditions): to check the data is not a negative number❌
    const allPositive = (...inputs) => {
      inputs.every(inp => inp > 0);
    };

    e.preventDefault();

    // 1. Get Data from FORM
    const type = inputType.value;
    const distance = +inputDistance.value; //LEARNING: converting string to number using '+' unary operator
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // 2. If workout: running, create running object
    if (type === 'running') {
      // debugger;
      const cadence = +inputCadence.value;
      console.log(type, cadence);
      // 3. Check if data is valid or not
      if (
        !Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(cadence)
        // !validInputs(distance, duration, cadence) ||❌
        // !allPositive(distance, duration, cadence)
      ) {
        //LEARNING: !Number.isFinite(distance) = Guard Clause -Its a Modern JS practice where we look for opposite of what we're looking for ie. in this case we don't want number. If the condition is TRUE then we simply return the function immediately
        return alert('Inputs have to be positive numbers');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // 2. If workout: cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(elevation)
        // !validInputs(distance, duration, elevation) ||❌
        // !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // 4. Add the newly created object in 'workout' array
    this.#workouts.push(workout);
    // console.log(workout, this.#workouts);

    // 5. Render workout on map and display marker
    // console.log(this.#mapEvent);
    this._renderWorkoutMarker(workout);

    // 6. Render workout on list
    this._renderWorkout(workout);

    // 7. Hide form and clear input fields
    this._hideForm();

    // 8. Setting Local storage for all workouts
    this._setLocalStorage();
  }
  // 5.
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃 ' : '🚴‍♀️ '} ${workout.description}`
      )
      .openPopup();
  }

  // 6.
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃 ' : '🚴‍♀️ '
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return; //Guard Clause ex

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // console.log(workout);

    //LEARNING: using setView() method of leaflet library, we can set the map to a certian position with ZOOM and DEFAULT ANIMATION
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 1,
    });

    //LEARNING: We can see how API works - how data is communicated through classes / objects / code[NOTE: JUST FOR KNOWLEDGE, NOT RELATED TO APP]...
    // workout.click();
  }

  // 8.
  //LEARNING: LocalStorage API is basically a local key/value store where key and values are both in string
  //NOTE ON LOCAL STORAGE API: It is very simple API and we must store small amount of data and avoid large data storage because localStorage is 'Blocking'.
  //NOTE: Objects coming from localStorage will not inherits methods than they did before for ex: click()
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); //first arg: name, second arg: string but we can convert an object to a string using JSON.stringigy(object)
  }

  //9.
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); //doing opposite of JSONStringify
    // console.log(data);
    if (!data) return;

    this.#workouts = data; //restoring the data even after multiple reloads

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  //10. remove localStorage Items based on a key
  reset() {
    localStorage.removeItem('workouts');

    //after removing workouts its time to reload the page programmatically
    location.reload(); //LEARNING: in-built of the browser that contains lots of methods and properties related to the browser
  }
}

const app = new App();
