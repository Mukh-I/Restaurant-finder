const form = document.querySelector("form");
const inputField = document.querySelector(".form-control");
const cuisineSelect = document.querySelector(".cuisine-select");
const optionSelect = document.querySelector(".option");
const restaurantList = document.querySelector(".rest-list");
const btnContainer = document.querySelector(".btn-container");
const content = document.querySelector(".content");
const PageNumDiv = document.querySelector(".page-num");

/* 
===============================================================
EVENT LISTENERS
=============================================================== 
*/

document.addEventListener("DOMContentLoaded", async function () {
  PageNumDiv.innerHTML = "";
  if (!JSON.parse(localStorage.getItem("searchHistory"))) {
    localStorage.setItem(
      "searchHistory",
      JSON.stringify({
        restaurants: [],
        restaurantInfo: null,
        cuisines: [],
        page: 1,
      })
    );
  }
  const searchHistory = getDataFromLocalStorage();
  if (searchHistory.restaurants.length > 0) {
    restaurantList.innerHTML = "";

    const result = paginate(searchHistory.restaurants, searchHistory.page);
    result.forEach(function ({ restaurant }) {
      renderRestaurant(restaurant, restaurantList);
    });

    if (searchHistory.restaurantInfo !== null) {
      renderRestaurantDetails(searchHistory.restaurantInfo);
    }
    renderBtn(searchHistory.restaurants);
    currentPage();
  }
  if (searchHistory.cuisines.length > 0) {
    return renderCuisinesOptions(searchHistory.cuisines);
  }

  if (searchHistory.cuisines.length < 1) {
    await getCuisines().catch(function () {
      return (restaurantList.innerHTML = renderErrorMsg(
        "Your location is disabled"
      ));
    });
  }
});

// fetch and display restaurant info
restaurantList.addEventListener("click", async function (e) {
  const searchHistory = getDataFromLocalStorage();
  content.innerHTML = "";
  renderLoadingSpinner(content);
  const target = e.target.closest(".restaurant");
  const restaurantLi = document.querySelectorAll(".restaurant");
  if (restaurantLi) {
    restaurantLi.forEach(function (el) {
      el.classList.remove("active");
    });
  }
  target.classList.add("active");
  if (!target) return;
  const { id } = target.dataset;
  const restaurant = await fetchData(
    `https://developers.zomato.com/api/v2.1/restaurant?res_id=${id}`
  );

  if (restaurant.code === 404) {
    const err = renderErrorMsg("This restaurant does not exist");
    return (content.innerHTML = err);
  }
  searchHistory.restaurantInfo = restaurant;
  persistDataToLocalStorage(searchHistory);
  renderRestaurantDetails(restaurant);
});

// pagination
btnContainer.addEventListener("click", function (e) {
  if (e.target.tagName !== "BUTTON") return;
  const searchHistory = getDataFromLocalStorage();
  searchHistory.page = Number(e.target.dataset.num);
  persistDataToLocalStorage(searchHistory);
  const result = paginate(searchHistory.restaurants, searchHistory.page);
  restaurantList.innerHTML = "";
  result.forEach(function ({ restaurant }) {
    renderRestaurant(restaurant, restaurantList);
  });

  renderBtn(searchHistory.restaurants);
  currentPage();
});

// fetch and display restaurants
form.addEventListener("submit", async function (e) {
  restaurantList.innerHTML = "";
  renderLoadingSpinner(restaurantList);
  e.preventDefault();
  await getRestaurants().catch(function () {
    return (restaurantList.innerHTML = renderErrorMsg(
      "Your location is disabled"
    ));
  });
});

// change select option, i.e. search by restaurant name or search by cuisine.
optionSelect.addEventListener("change", function (e) {
  if (e.target.value == 1) toggle(inputField);
  if (e.target.value == 2) toggle(cuisineSelect);
});

/* 
===============================================================
HELPER FUNCTIONS
=============================================================== 
*/

async function getRestaurants() {
  btnContainer.innerHTML = "";
  PageNumDiv.innerHTML = "";
  const searchHistory = getDataFromLocalStorage();
  const location = await getLocation();
  const coords = location.coords;
  const selectedOption = Number(
    optionSelect.options[optionSelect.selectedIndex].value
  );
  let searchTerm;
  let url;
  if (selectedOption === 1) {
    searchTerm = inputField.value;
    url = `https://developers.zomato.com/api/v2.1/search?lat=${coords.latitude}&lon=${coords.longitude}&q=${searchTerm}`;
    inputField.value = "";
  }

  if (selectedOption === 2) {
    searchTerm = cuisineSelect.options[cuisineSelect.selectedIndex].value;
    url = `https://developers.zomato.com/api/v2.1/search?lat=${coords.latitude}&lon=${coords.longitude}&cuisines=${searchTerm}`;
  }

  const data = await fetchData(url);
  if (data.results_found < 1) {
    const error = renderErrorMsg("No restaurants found");

    return (restaurantList.innerHTML = error);
  }
  const { restaurants } = data;
  searchHistory.restaurants = restaurants;
  searchHistory.page = 1;
  persistDataToLocalStorage(searchHistory);
  restaurantList.innerHTML = "";
  const result = paginate(restaurants);
  result.forEach(function ({ restaurant }) {
    renderRestaurant(restaurant, restaurantList);
  });

  renderBtn(restaurants);
  currentPage();
}

async function getCuisines() {
  const location = await getLocation();
  const searchHistory = getDataFromLocalStorage();
  let cuisines;
  if (searchHistory.cuisines.length === 0) {
    const coords = location.coords;

    const cuisineUrl = `https://developers.zomato.com/api/v2.1/cuisines?lat=${coords.latitude}&lon=${coords.longitude}`;

    const data = await fetchData(cuisineUrl);

    cuisines = data.cuisines;
    searchHistory.cuisines = cuisines;
    persistDataToLocalStorage(searchHistory);
  }

  cuisines = searchHistory.cuisines;
  renderCuisinesOptions(cuisines);
}

async function fetchData(url) {
  const API_KEY = "d6ba94e75e1680f6cb0c8b65e2567297";

  const response = await fetch(url, { headers: { "user-key": API_KEY } });
  const data = await response.json();
  return data;
}

function paginate(arr, page = 1) {
  const countPerPage = 7;
  const startIndex = (page - 1) * countPerPage;
  const endIndex = page * countPerPage;
  return arr.slice(startIndex, endIndex);
}

function renderBtn(array) {
  const { page } = getDataFromLocalStorage();

  const currentPage = page;
  const numOfPages = Math.ceil(array.length / 7);
  document.querySelector(".btn-container").innerHTML = "";

  if (currentPage === 1 && numOfPages > 1) {
    return createBtns(currentPage + 1, "next");
  }

  if (currentPage === numOfPages && numOfPages > 1) {
    return createBtns(currentPage - 1, "prev");
  }

  if (currentPage < numOfPages) {
    createBtns(currentPage - 1, "prev");
    createBtns(currentPage + 1, "next");
  }

  return "";
}

function formatTel(str) {
  if (str.includes(",")) {
    return str.split(",")[0];
  }
  return str;
}

function shortenStr(str) {
  if (str.length > 13) {
    return str.substr(0, 13) + "...";
  }
  return str;
}

function toggle(el) {
  if (el === inputField) {
    cuisineSelect.parentNode.style.display = "none";
    inputField.parentNode.style.display = "block";
  }
  if (el === cuisineSelect) {
    inputField.parentNode.style.display = "none";
    cuisineSelect.parentNode.style.display = "block";
  }
}

function currentPage() {
  const { page, restaurants } = getDataFromLocalStorage();
  const pages = Math.ceil(restaurants.length / 7);
  return (PageNumDiv.innerHTML = `${page}/${pages} page(s)`);
}

function persistDataToLocalStorage(data) {
  localStorage.setItem("searchHistory", JSON.stringify(data));
}

function getDataFromLocalStorage() {
  const storedData = JSON.parse(localStorage.getItem("searchHistory"));
  return storedData;
}

function getLocation() {
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

function renderCuisinesOptions(array) {
  array.forEach(function (el) {
    renderOption(el.cuisine);
  });
}

function renderOption(cuisine) {
  const html = `
    <option value=${cuisine.cuisine_id}>${cuisine.cuisine_name}</option>
  `;

  document
    .querySelector(".cuisine-select")
    .insertAdjacentHTML("beforeend", html);
}

function renderRestaurant(restaurant, parentEl) {
  const src =
    "https://cwdaust.com.au/wpress/wp-content/uploads/2015/04/placeholder-restaurant.png";

  const html = `
    <li class="restaurant" data-id=${restaurant.R.res_id}>
      <img
        src=${restaurant.thumb || src}
        alt=""
      />
      <div>
        <h6>${shortenStr(restaurant.name)}</h6>
        <p>Tel: ${formatTel(restaurant.phone_numbers)}</p>
      </div>
    </li>
  
  `;

  parentEl.insertAdjacentHTML("beforeend", html);
}

function renderRestaurantDetails(restaurant) {
  const src =
    "https://cwdaust.com.au/wpress/wp-content/uploads/2015/04/placeholder-restaurant.png";
  const html = `
    <div
    class="card"
    style="width: 82rem; border: none; border-radius: 0; overflow: hidden; padding-top: 1rem ;"
    
    >
      <img
        style="height: 75%"
        src=${restaurant.thumb || src}
        class="card-img-top"
        alt="..."
      />  
    
      <h4 class="m-3">${restaurant.name}</h4>
    </div>
    <div class="card-body">
      <div class="row">
        <div class="col-12">
          <div class="card border-success mb-3" >
            <div class="card-header">Cuisines</div>
            <div class="card-body text-secondary">
              <p class="card-text">${restaurant.cuisines}</p>
            </div>
          </div>
        </div>
    
        <div class="col-12">
          <div class="card border-secondary mb-3" >
            <div class="card-header">Ratings</div>
            <div class="card-body text-secondary">
              <p class="card-text">${
                restaurant.user_rating.aggregate_rating
              } stars.</p>
            </div>
          </div>
        </div>
        <div class="col-12">
          <div class="card border-secondary mb-3" >
            <div class="card-header">Opnening times</div>
            <div class="card-body text-secondary">
              <p class="card-text">${restaurant.timings}</p>
            </div>
          </div>
        </div>
    
        <div class="col-12">
          <div class="card border-secondary mb-3" >
            <div class="card-header">Contact</div>
            <div class="card-body text-secondary">
              <p class="card-text">${restaurant.location.address}</p>
              <p class="card-text">Tel: ${restaurant.phone_numbers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  
  `;

  content.innerHTML = html;
}

function renderLoadingSpinner(parentEl) {
  const loadingSpinner = `
  <div class="d-flex justify-content-center w-100 mt-3">
    <div class="spinner-border text-danger" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
  `;

  parentEl.insertAdjacentHTML("afterbegin", loadingSpinner);
}

function createBtns(pageNum, className) {
  const btn =
    className === "next"
      ? `
    <button class=${className} data-num=${pageNum}>${pageNum} &raquo;</button>`
      : `<button class=${className} data-num=${pageNum}>&laquo; ${pageNum}</button>
  `;

  btnContainer.insertAdjacentHTML("beforeend", btn);
}

function renderErrorMsg(msg) {
  return `<p class='text-center text-danger fs-3'> Error! ${msg}</p>`;
}
