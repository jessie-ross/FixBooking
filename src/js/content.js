// ─────────────────────────────────────────────────────────────────────────────
// Preamble

/* eslint-disable react/jsx-filename-extension */
/* eslint-disable react/prop-types */

import React from 'react';
import ReactDOM from 'react-dom';
import queryString from 'query-string';
import styled from 'styled-components';
import jQuery from 'jquery';
import classnames from 'classnames';
import { createStore, applyMiddleware } from 'redux';
import { connect, Provider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';

import { ExtensionContentI as ExtRuntime } from './extension';


// ─────────────────────────────────────────────────────────────────────────────
// Errors

function panic(message) {
  if ((typeof message) !== 'string') {
    panic('Invalid Panic');
  }

  const e = new Error(`Fatal Error: ${message}`);
  throw e;
}


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


// ─────────────────────────────────────────────────────────────────────────────
// Side-Effects

const logger = store => next => (action) => { // eslint-disable-line no-unused-vars
  console.log('Action:', action, (new Date()).toJSON());
  return next(action);
};

const sessionEffects = store => next => (action) => {
  // This hooks up all our actions to side-effects.
  // See `reducer' for the description of each action.
  switch (action.type) {
    case 'SESSION RENEW':
      store.dispatch({ type: 'LOADER SESSION START' });
      BookingI.renewSession(status => (
        store.dispatch({ type: 'STATUS TOAST', status })
      )).then((session) => {
        store.dispatch({ type: 'SESSION UPDATE', session });
        store.dispatch({ type: 'LOADER SESSION FINISH' });
        ExtRuntime.dispatch({ type: 'SESSION CHANGED', session });
      });
      break;
    case 'MASTER SESSION UPDATE':
      if (store.getState().session !== action.session) {
        store.dispatch({ type: 'SESSION UPDATE', session: action.session });
      }
      break;
    case 'SESSION UPDATE':
      if (!action.session) {
        panic('Invalid session in "SESSION UPDATE"');
      }
      store.dispatch({ type: 'STATUS TOAST', status: 'Updating in the new session.' });
      BookingI.updateSessionInPage(action.session);
      store.dispatch({ type: 'STATUS TOAST', status: 'Session updated successfully.' });
      break;
    default:
      break;
  }
  return next(action);
};


// ─────────────────────────────────────────────────────────────────────────────
// Statefulness

const defaultState = {
  login: 'UNSURE',
  session: null,
  status: null,
  isLoading: false,
};

function reducer(state = defaultState, action) {
  // This reducer lists all actions we use.
  switch (action.type) {
    case 'SESSION INIT':
      // When we first see a session on a page.
      // We assume the session is fresh and working.
      return Object.assign({}, state, { session: action.session });
    case 'SESSION RENEW':
      // When the a manual renew is performed.
      // This specifically just fetches a new session number for us.
      // And then runs an update
      break;
    case 'SESSION UPDATE':
      // When we recieve a session we should update into to our page.
      // This occurs from a Renew or a Master Session Update.
      return Object.assign({}, state, { session: action.session });
    case 'MASTER SESSION UPDATE':
      // When the background master script has a fresh session number sent to it.
      break;
    case 'STATUS TOAST':
      // When we have a status to display
      return Object.assign({}, state, { status: action.status });
    case 'LOADER SESSION START':
      // When the Session is Renewing or updating
      return Object.assign({}, state, { isLoading: true });
    case 'LOADER SESSION FINISH':
      // When the Session is ready
      return Object.assign({}, state, { isLoading: false });
    default:
      break;
  }
  return state;
}


// ─────────────────────────────────────────────────────────────────────────────
// Interface

// ## Style

const H1 = styled.h1`
margin-top: 0;
`;
const Main = styled.div`
position: absolute;
top: 0;
right: 0;
background: #DDD;
padding: 2em;
opacity: .9;
min-width: 200px;
z-index: 200;
&.closed {
 background: #000;
 padding: 0;
 min-width: 0;
}
`;
const DL = styled.dl`
dd {
    display: block;
    font-family: monospace;
    white-space: pre;
}
`;


// ## Code

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      state: 'LOGGED OUT',
      hotelId: BookingI.getHotelId(),
      isInterfaceClosed: true,
    };

    if (this.props.session !== undefined) {
      this.state.state = 'LOGGED IN';
    }

    // Bindings
    this.toggleInterface = () => {
      this.setState(prev => (
        Object.assign(
          {},
          prev,
          { isInterfaceClosed: !prev.isInterfaceClosed },
        )));
    };
  }

  render() {
    const isClosed = this.state.isInterfaceClosed;
    const className = classnames({
      closed: isClosed,
    });

    return (
      <Main className={className}>
        {!isClosed ? (
          <div>
            <H1>FixBooking</H1>
            <DL>
              <dt>Login Status</dt>
              <dd>{this.state.state}</dd>

              <dt>Last Status</dt>
              <dd>{this.props.status || 'START'}</dd>

              <dt>Session Id</dt>
              <dd>{this.props.session || 'None'}</dd>

              <dt>Hotel Id</dt>
              <dd>{this.state.hotelId || 'None'}</dd>
            </DL>
            <button onClick={this.props.renewSession}>Renew Session</button>
            <button onClick={this.toggleInterface}>Close</button>
          </div>
        ) : (
          <button onClick={this.toggleInterface}>
            &lt;
          </button>
        )}
      </Main>

    );
  }
}

// eslint-disable-next-line no-unused-vars
const mapStateToProps = (state, ownProps) => ({
  status: state.status,
  session: state.session,
  isLoading: state.isLoading,
});

// eslint-disable-next-line no-unused-vars
const mapDispatchToProps = (dispatch, ownProps) => ({
  renewSession: () => { dispatch({ type: 'SESSION RENEW' }); },
});

const ReduxApp = connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);


// ─────────────────────────────────────────────────────────────────────────────
// Runner

jQuery(() => {
  // Redux
  const store = createStore(
    reducer,
    composeWithDevTools(applyMiddleware(logger, sessionEffects)),
  );

  // React
  const newDiv = document.createElement('div');
  newDiv.setAttribute('id', 'fix-bookingcom-extension');
  document.body.appendChild(newDiv);
  ReactDOM.render(
    <Provider store={store}>
      <ReduxApp />
    </Provider>,
    newDiv,
  );

  // Initialise the page
  const session = BookingI.getSession();
  // Our extension only deals with session pages
  if (session) {
    store.dispatch({ type: 'SESSION INIT', session });
  }

  // Background Thread Connections

  // This sets up the background thread connection
  console.log('Connecting');
  ExtRuntime.connect();

  // Make the PageAction work
  ExtRuntime.dispatch({ type: 'TAB ACTIVE' });

  // Let the background thread know what we are doing
  ExtRuntime.dispatch({
    type: 'SESSION REGISTER',
    session: BookingI.getSession(),
  });

  // Recieve sessions
  ExtRuntime.subscribe('MASTER SESSION UPDATE', m =>
    (store.dispatch({ type: 'MASTER SESSION UPDATE', session: m.session })));
});
