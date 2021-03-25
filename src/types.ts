declare global {
  interface EventTarget {
    once: EventTarget['addEventListener'];
  }
}

export { };
