// Web shim for @capacitor/synapse.
// The real Synapse package is used only on native platforms; on the web
// we just need a module so bundlers do not error when @capacitor/geolocation
// imports it. All exports here are safe no-ops.

export const exposeSynapse = () => {
  // no-op on web
};

export const Synapse = {};

export default {};

