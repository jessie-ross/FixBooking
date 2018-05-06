// ─────────────────────────────────────────────────────────────────────────────
// Booking.com Interface

// Helpers

function getSearch(location) {
  return queryString.parse(location.search);
}

function updateSESinSearch(session, search) {
  const parsed = queryString.parse(search);
  parsed.ses = session;
  return queryString.stringify(parsed);
}

// Main

const BookingI = {

  getSearch() {
    return getSearch(window.location);
  },

  getSession() {
    return BookingI.getSearch().ses;
  },

  getHotelId() {
    return BookingI.getSearch().hotel_id;
  },

  async renewSession(setStatus) {
    setStatus('Fetching login frame.');

    // Prepare the iFrame
    const iframe = document.createElement('iframe');
    iframe.style = 'height: 0; width: 0; display: none;';
    iframe.src = '/?lang=en&message=ERR100';
    const readyPromise = new Promise((resolve) => {
      iframe.onload = () => resolve(iframe);
    });
    document.body.appendChild(iframe);

    // Get a ready iFrame
    const page1 = await readyPromise;
    // (I am not sure if this is redundant...)
    const $form = jQuery(page1.contentDocument).find('form.form-box-login__fields').first();
    if ($form.length < 1) {
      panic('Couldn\'t find the login form');
    }

    setStatus('Loging in.');

    // Maybe these are even prefilled in...
    const $username = $form.find('[name="loginname"]').first();
    const username = $username.val();
    const $password = $form.find('[name="password"]').first();
    const password = $password.val();

    // Lets ensure that they are.
    if ((typeof username) !== 'string' ||
        (typeof password) !== 'string' ||
        username.length < 1 ||
        password.length < 1) {
      panic('No username and/or password ready.');
    }

    // Press Submit
    $form.find('[type="submit"]').click();

    // Create a promise to get the next load
    const readyPromise2 = new Promise((resolve) => {
      iframe.onload = () => resolve(iframe);
    });

    const page2 = await readyPromise2;

    // Get the search out of the new url
    const session = getSearch(page2.contentWindow.location).ses;
    if (!session) {
      panic('Can\'t find session.');
    }

    setStatus('Logged in.');

    return session;
  },

  updateSessionInPage(session) {
    // I wish this was atomic somehow
    jQuery('a').each((i, a) => {
      // eslint-disable-next-line no-param-reassign
      a.search = updateSESinSearch(session, a.search);
    });
    jQuery('[name="ses"]').each((i, input) => {
      // eslint-disable-next-line no-param-reassign
      input.value = session;
    });
  },
};
