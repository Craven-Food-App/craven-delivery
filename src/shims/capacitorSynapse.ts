// Web shim for @capacitor/synapse used by @capacitor/geolocation.
// On native platforms the real Synapse implementation is used; on the web
// we only need a module so bundlers don't error when resolving the import.

export const exposeSynapse = () => {
  // no-op on web
};

export const Synapse = {};

export default {};

