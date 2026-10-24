# Independent iPhone feeding reminders

Version 1 has no Google API integration, OAuth tokens, sync, or push server. Create reminders manually in Google Tasks when completion tracking matters, or Calendar events when a signal is enough. Obsidian on the phone is unnecessary.

For each desired `(colony_id, feed_type)` pair, choose your own start date, time, time zone, and recurrence. Suggested labels are `<colony-id> - Syrup`, `<colony-id> - Protein`, and `<colony-id> - Seeds`. No biological interval is invented. There are no automatic water or maintenance reminders.

## Google Tasks

Create a private task list and a separate task for each needed pair. Set a date and specific time, open the recurrence selector, choose a preset or custom interval, and save. Mark a feeding task complete after performing it; record the corresponding feed_* value in Obsidian separately. Shared tasks/subtasks can have recurrence restrictions. [Google's iPhone recurrence instructions](https://support.google.com/tasks/answer/12132599?co=GENIE.Platform%3DiOS&hl=en-GB).

## Google Calendar

Create a private feeding calendar and recurring events without guests. Set your chosen schedule and notification timing. On iPhone, use Calendar settings for the calendar's default alerts or edit a specific event's notifications. [Google's iPhone notification instructions](https://support.google.com/calendar/answer/37242?co=GENIE.Platform%3DiOS&hl=en).

Allow notifications for the chosen app in iOS, check the correct account and Focus settings, and test an alert at a convenient time. Delivery on a personal phone has not been tested by this project. Google reminders depend on the phone/account and connectivity; the journal remains offline-capable.

Deleting or editing an Obsidian record never cancels a Google alert. Completing a Google task never writes a feed_* property. Future API settings can refer to the existing stable colony ID and feed category without changing observations. Any future credentials must stay outside the public repository.
