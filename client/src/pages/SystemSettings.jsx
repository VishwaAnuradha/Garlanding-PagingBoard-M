
// Import useEffect and useState hooks from React
import { useEffect, useState } from 'react';

// Import Save icon from lucide-react
import { Save } from 'lucide-react';

// Import API service functions for getting and saving system settings
import {
  getSystemSettings,
  saveSystemSettings
} from '../services/salesService';

// Default settings used when the application starts
const blank = {
  systemName: '',
  counterName: '',
  printerName: '',

  // Default ticket prices
  ticketPrices: {
    GARLANDING: 0,
    'PAGING BOARD': 0
  }
};

// Main SystemSettings component
export default function SystemSettings() {

  // Store system settings
  const [settings, setSettings] = useState(blank);

  // Store success or error messages
  const [message, setMessage] = useState('');

  // Track whether the settings are currently being saved
  const [saving, setSaving] = useState(false);

  // useEffect runs once when the component loads
  useEffect(() => {

    // Retrieve existing system settings from the backend
    getSystemSettings()

      // Update settings state with the received data
      .then(setSettings)

      // Display an error message if the request fails
      .catch(error => setMessage(error.message));

  }, []); // Empty dependency array means run only once


  // Handle changes in input fields
  const change = event => {

    // Get the input field name and entered value
    const { name, value } = event.target;

    // Check whether the changed field belongs to ticketPrices
    setSettings(current =>

      name in current.ticketPrices

        // If it is a ticket price, update ticketPrices only
        ? {
            ...current,
            ticketPrices: {
              ...current.ticketPrices,
              [name]: value
            }
          }

        // Otherwise, update the normal settings field
        : {
            ...current,
            [name]: value
          }
    );
  };


  // Handle the form submission and save settings
  const save = async event => {

    // Prevent the browser from refreshing the page
    event.preventDefault();

    // Set saving status to true
    setSaving(true);

    // Clear previous messages
    setMessage('');

    try {

      // Send updated settings to the backend
      const next = await saveSystemSettings({

        // Copy all existing settings
        ...settings,

        // Convert ticket prices from strings into numbers
        ticketPrices: {
          GARLANDING: Number(settings.ticketPrices.GARLANDING),

          'PAGING BOARD': Number(
            settings.ticketPrices['PAGING BOARD']
          )
        }
      });

      // Update the settings with the response from the backend
      setSettings(next);

      // Display success message
      setMessage('Settings saved.');

    } catch (error) {

      // Display an error message if saving fails
      setMessage(error.message);

    } finally {

      // Reset saving status whether successful or unsuccessful
      setSaving(false);
    }
  };


  // Display the System Settings interface
  return (

    <div className="max-w-3xl">

      {/* Administration section label */}
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        Administration
      </p>

      {/* Main page heading */}
      <h1 className="mt-1 text-3xl font-bold">
        System settings
      </h1>

      {/* Page description */}
      <p className="mt-2 text-slate-500">
        Manage counter details and ticket pricing.
      </p>


      {/* Form for updating system settings */}
      <form
        onSubmit={save}
        className="mt-6 space-y-5"
      >

        {/* Counter Information Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="text-lg font-bold">
            Counter information
          </h2>

          {/* Input fields arranged in a responsive grid */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {/* System name input */}
            <Field
              label="System name"
              name="systemName"
              value={settings.systemName}
              onChange={change}
              required
            />

            {/* Counter name input */}
            <Field
              label="Counter name"
              name="counterName"
              value={settings.counterName}
              onChange={change}
              required
            />

            {/* Printer name input */}
            <div className="sm:col-span-2">
              <Field
                label="Printer name"
                name="printerName"
                value={settings.printerName}
                onChange={change}
                placeholder="Optional receipt printer name"
              />
            </div>

          </div>
        </section>


        {/* Ticket Pricing Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="text-lg font-bold">
            Ticket pricing
          </h2>

          {/* Explain the currency and pricing rules */}
          <p className="mt-1 text-sm text-slate-500">
            Prices are in Sri Lankan rupees and apply to future sales only.
          </p>

          {/* Ticket price input fields */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {/* Garlanding ticket price */}
            <Field
              label="Garlanding ticket price (Rs.)"
              name="GARLANDING"
              type="number"
              min="0"
              step="0.01"
              value={settings.ticketPrices.GARLANDING}
              onChange={change}
              required
            />

            {/* Paging Board ticket price */}
            <Field
              label="Paging board price (Rs.)"
              name="PAGING BOARD"
              type="number"
              min="0"
              step="0.01"
              value={settings.ticketPrices['PAGING BOARD']}
              onChange={change}
              required
            />

          </div>
        </section>


        {/* Display success or error message */}
        {message && (

          <p
            className={`rounded-lg p-3 text-sm ${
              message.startsWith('Settings saved')
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message}
          </p>

        )}


        {/* Save button section */}
        <div className="flex justify-end">

          <button
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >

            {/* Display Save icon */}
            <Save size={18} />

            {/* Change button text while saving */}
            {saving ? 'Saving...' : 'Save settings'}

          </button>

        </div>

      </form>
    </div>
  );
}


// Reusable Field component
// This component creates input fields with a label
function Field({ label, ...props }) {

  return (

    <label className="block text-sm font-semibold text-slate-700">

      {/* Display the input field label */}
      <span className="mb-1.5 block">
        {label}
      </span>

      {/* Render the input and pass all received properties */}
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

    </label>
  );
}
