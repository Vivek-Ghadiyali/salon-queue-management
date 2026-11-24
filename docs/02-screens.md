# Salon Queue Management System — Screens & Features

## Global UI and behaviour
- Theme: dark luxury. Use a near-black/charcoal background, layered dark cards, warm gold primary actions, restrained neutral text and clear status colours.
- Language: English only. Do not add a language selector or Gujarati translations.
- Use consistent navigation and labels across screens. Staff screens should be readable on tablet/laptop; customer screens must work on a phone.
- Queue information must stay synchronized across open customer, reception, barber and TV-display windows, targeting updates within five seconds.
- Show useful loading, empty and error states. Do not leave buttons decorative: every visible action must work or be clearly disabled with an explanation.
- Use realistic sample salon services and barber names for development/demo data. Clearly distinguish sample data from real customer records.

## Screen 1: Home (/)
**User and goal:** Customer; understand the salon's current queue and start joining.

**Layout, top to bottom**
- Salon name/logo and open/closed badge, including closing time when configured.
- Live summary card showing the number of people waiting and approximate wait.
- Barber cards/chips showing each barber's name and status (Available, Busy or On break).
- Primary gold **Join Queue** button.

**Actions**
- **Join Queue:** opens `/join`.
- If online joining is closed, disable the join action and show a clear message. Walk-ins remain possible through reception.

**Responsive behaviour**
- Phone: single-column layout, prominent live summary and full-width Join Queue button.
- Tablet/desktop: centered content with barber cards arranged in a row/grid.

**States**
- Loading: show skeleton/placeholder cards.
- Empty queue: show a friendly message that no customers are waiting.
- Salon closed/online queue closed: show the relevant status and explain that online joining is unavailable.

## Screen 2: Join Queue (/join)
**User and goal:** Customer; provide details and choose services and barber.

**Layout, top to bottom**
- Name field.
- Phone field; require exactly 10 digits and show an inline validation message.
- Service cards with service name, duration and price. Allow multi-selection up to a maximum of three services.
- Barber selector: **Any barber (fastest)** plus individual barber choices, showing availability.
- Live summary that recalculates selected service duration, total price and estimated wait as selections change.
- Gold **Confirm** button.

**Actions and validation**
- Selecting a service adds/removes it from the selection and updates the summary immediately.
- Do not allow more than three services.
- Do not allow a disabled service to be selected.
- A barber on break must not be presented as available for new specific-barber selection; if a customer has selected that barber and the barber goes on break, show the break message described in the rules.
- **Confirm:** validate name, phone, at least one service, service limit and online queue availability. On success, create the queue entry and open `/status/:id`.
- Prevent duplicate active queue entries for the same phone number; if one exists, direct the customer to the existing active spot rather than creating another.

**Responsive behaviour**
- Phone: one-column service cards and a clear sticky/visible summary and Confirm action.
- Tablet/desktop: service cards may use a grid, with the live summary beside the form.

**States**
- Empty selection: explain that at least one service is required.
- Invalid phone: show a clear 10-digit validation error.
- Queue closed: disable Confirm and explain that online joining is closed.
- No available barbers/services: show a helpful message and prevent invalid confirmation.
- Submission failure: retain entered details and show a retry message.

## Screen 3: My Status (/status/:id)
**User and goal:** Customer; track their queue entry until service is complete or the entry is closed.

**Layout, top to bottom**
- Large queue token, for example `S-14`.
- Current status and queue position.
- Estimated waiting time, refreshed when queue/service state changes.
- Selected services and preferred/assigned barber.
- When the customer is second in line, show **Start coming to the salon**.
- When called, show a prominent full-screen or high-emphasis gold **It's your turn! Go to [barber name]** state.
- **Cancel my spot** action with a confirmation dialog.

**Actions**
- **Cancel my spot:** ask for confirmation; on confirm, change Waiting to Cancelled. Do not offer cancellation once Called or In Chair.
- Status and position update automatically; the customer should not need to refresh.
- When status becomes Done, show a completion message. For No-show or Cancelled, show the final status and explain that the spot is no longer active.

**Responsive behaviour**
- Phone-first, with a large readable token, clear progress/status and thumb-friendly action.
- Desktop may use a centered status card.

**States**
- Loading: show token/status placeholders.
- Invalid or unknown token: show an understandable not-found message.
- Connection issue: show the last available status and a reconnecting/error notice.
- Called: make the turn instruction unmistakable.

## Screen 4: Reception Dashboard (/reception) — tablet/laptop
**User and goal:** Receptionist; manage all waiting entries and allocate eligible customers to barbers.

**Layout**
- Top bar with current queue/open status and **+ Add walk-in**.
- Barber cards showing barber name, availability, current customer, elapsed/time-left information where available, and **Call next**.
- Ordered waiting list showing token, customer name, selected services, preferred barber and estimated wait.
- Each eligible waiting entry has **No-show** and **Cancel** actions where appropriate.
- Highlight customers waiting more than 60 minutes in amber.

**Actions**
- **+ Add walk-in:** opens a quick form for customer name, phone number, services and preferred barber; validates the same core fields and appends the entry to the end of the same queue.
- **Call next** on a barber card: assigns the earliest eligible Waiting customer who selected that barber or Any Barber. Never assign a customer who selected a different named barber.
- **No-show:** available for a Called customer after the 10-minute grace period; marks the entry No-show.
- **Cancel:** asks for confirmation and marks an eligible Waiting entry Cancelled.
- Queue list and barber cards update when any customer or barber action changes the queue.

**Responsive behaviour**
- Tablet landscape: barber cards across the top/left and waiting list in a readable main area.
- Laptop/desktop: use a wider multi-column dashboard.
- Phone: provide a simplified stacked layout if accessed, without hiding essential actions.

**States**
- No waiting customers: show “No one waiting — walk right in!” or equivalent.
- No eligible customer for a barber: explain that no waiting customer matches that barber's preference.
- No barbers available: show a clear warning and do not call a customer.
- Loading/error: show status and retry affordance.

## Screen 5: Barber View (/barber/:name) — phone
**User and goal:** Barber; manage their own current service and availability.

**Layout**
- Barber name and Available/On break status.
- Current customer card with token, customer name and selected services.
- Service timer/elapsed time after service starts.
- Large **Start** and **Done** buttons according to the current state.
- **Next for you** preview showing the next eligible customer, if one exists.
- Availability toggle: **Available / On break**.

**Actions**
- **Start:** changes the assigned Called entry to In Chair and starts its service timer.
- **Done:** changes the In Chair entry to Done, clears the barber's current customer and makes the barber available for the next eligible customer if not on break.
- **On break:** marks the barber unavailable for new assignments. **Available** returns the barber to duty.
- A barber must never have more than one customer In Chair.

**Responsive behaviour**
- Phone-first, single-column cards and large controls with at least 44px tap targets.
- Tablet/desktop may use a wider centered card.

**States**
- No current customer: show a clear waiting state and next eligible customer if present.
- On break: visibly show the break state and prevent new assignments.
- Action failure: preserve the current state and explain that the action did not complete.

## Screen 6: Waiting Area TV (/display)
**User and goal:** Waiting customers; see which customer is with each barber and who is up next.

**Layout**
- Full-screen, high-contrast display intended for a TV.
- One row/card per barber with barber name, status and current token (for example, `Now: S-12`).
- An **Up next** area listing the next five eligible tokens with estimated times where available.
- Newly called token flashes/highlights in gold and plays a short chime.

**Actions**
- This is a display-only screen; it has no queue-management controls.
- Update automatically when a customer is called, starts service or finishes.

**Responsive behaviour**
- Optimize for a 1920×1080 TV and readability from approximately five metres.
- On smaller screens, stack barber cards and the Up next list without making token text too small.

**States**
- No active customers: show a calm “No customers currently being served” message.
- Empty queue: show “No one waiting”.
- Connection issue: show a visible stale/connection indicator rather than silently displaying outdated data.

## Screen 7: Owner Settings (/admin)
**User and goal:** Salon owner; configure services, barbers and online queue availability and review daily performance.

**Layout**
- Services list/table with service name, duration in minutes, price and enabled/disabled state.
- Controls to add/edit a service and switch a service on/off.
- Barbers on duty today with availability/duty toggles.
- Online queue switch: Open / Closed.
- Today's statistics cards: customers served, average wait and no-shows.

**Actions**
- Add/edit service: save name, duration and price after validation.
- Service on/off: disabled services disappear from the customer Join Queue choices; existing queue entries retain their selected service details.
- Barber duty toggle: update whether that barber is working and eligible for assignments.
- Queue Open/Closed: closing disables online joining with a clear message; walk-ins remain allowed.
- Statistics reflect the current day's queue records.

**Responsive behaviour**
- Desktop/tablet: readable table and summary cards.
- Phone: stack summary cards and use a compact service list or edit panel.

**States**
- No services: explain that the owner must add a service before customers can join.
- No barbers on duty: show a clear warning.
- Save/validation error: keep the form values and show the issue.
