// Fehler sichtbar machen statt still zu scheitern.
export function guard(fn, label) {
  return (...args) => {
    try {
      const result = fn(...args);
      if (result && typeof result.catch === 'function') {
        result.catch(e => {
          console.error(label, e);
          window.alert('Fehler bei "' + label + '": ' + (e && e.message ? e.message : String(e)));
        });
      }
      return result;
    } catch (e) {
      console.error(label, e);
      window.alert('Fehler bei "' + label + '": ' + (e && e.message ? e.message : String(e)));
    }
  };
}
