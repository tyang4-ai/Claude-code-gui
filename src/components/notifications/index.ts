/**
 * Toast Notification System
 *
 * A context-based notification system for user feedback.
 *
 * @example
 * ```tsx
 * // In your App.tsx or root component:
 * import { ToastProvider } from './components/notifications';
 *
 * function App() {
 *   return (
 *     <ToastProvider>
 *       <YourApp />
 *     </ToastProvider>
 *   );
 * }
 *
 * // In any component:
 * import { useToast } from './components/notifications';
 *
 * function MyComponent() {
 *   const { success, error, warning, info } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       success("Data saved successfully!");
 *     } catch (err) {
 *       error("Failed to save data", { title: "Save Error" });
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */

export { Toast, type ToastData, type ToastType, type ToastProps } from "./Toast";

export {
  ToastProvider,
  useToast,
  type ToastOptions,
  type ToastContextValue,
  type ToastProviderProps,
} from "./ToastProvider";
