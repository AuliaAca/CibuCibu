/** Tiny typed event bus for scene → React one-shot events. State goes through the store. */
type Events = {
  ready: void;
  progress: number;
};

type Handler<T> = (payload: T) => void;
const handlers = new Map<keyof Events, Set<Handler<never>>>();

export const bridge = {
  on<K extends keyof Events>(k: K, h: Handler<Events[K]>) {
    if (!handlers.has(k)) handlers.set(k, new Set());
    handlers.get(k)!.add(h as Handler<never>);
    return () => void handlers.get(k)!.delete(h as Handler<never>);
  },
  emit<K extends keyof Events>(k: K, payload: Events[K]) {
    handlers.get(k)?.forEach((h) => (h as Handler<Events[K]>)(payload));
  },
};
