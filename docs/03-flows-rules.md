# Salon Queue Management System — Flows & Rules

## Main flow: remote customer
1. Customer opens Home (`/`) and selects **Join Queue**.
2. Customer enters name and 10-digit phone number, selects one to three services, and chooses a specific barber or **Any barber**.
3. The live summary shows the selected services' total duration and price, plus an estimated wait.
4. Customer confirms. The system creates a queue entry, assigns the next daily token (for example, `S-14`) and opens My Status (`/status/:id`).
5. Customer watches their position and estimated wait. When second in line, the status page displays **Start coming to the salon**.
6. Receptionist selects **Call next** on an eligible barber's card. The entry changes to Called, and the customer's status page displays **It's your turn! Go to [barber]**.
7. The waiting-area TV highlights the newly called token.
8. Barber presses **Start**; status becomes In Chair. Barber presses **Done**; status becomes Done and the entry leaves the active queue.

## Main flow: walk-in
1. Customer arrives at the salon.
2. Receptionist selects **+ Add walk-in** on the Reception Dashboard.
3. Receptionist enters name, phone number, selected services and barber preference.
4. The system validates the details and adds the customer to the end of the same queue with a new token.
5. The customer is handled by the same Call next, Start and Done process as a remote customer.

## Statuses and allowed transitions
- `Waiting -> Called`
- `Waiting -> Cancelled`
- `Called -> In Chair`
- `Called -> No-show`
- `In Chair -> Done`
- Statuses must never move backwards.
- Done, Cancelled and No-show are terminal states for that queue entry. A customer who returns after No-show must be added as a new entry at the end and receive a new token.

## Queue and barber-selection rules
- Queue order is first come, first served.
- **Call next** for barber X selects the earliest Waiting customer who chose barber X or **Any barber**.
- A customer who selected a named barber must never be assigned to a different barber.
- A customer who selected **Any barber** may be assigned to an eligible available barber.
- A barber can have only one customer In Chair at a time.
- A barber who is on break or not on duty must not receive a new customer.
- If a customer selected a barber who is on break, show a message such as “[Barber name] is on break”; do not silently reassign that customer.
- If no eligible customer exists for a barber, Call next must not assign an ineligible customer.

## Waiting-time rule
- Estimated waiting time is approximately: **total minutes of services ahead ÷ number of barbers working**.
- Recalculate the estimate when queue order, service durations, barber duty/availability or service progress changes.
- Display the estimate as approximate, not as a guaranteed appointment time.
- The implementation must use this rule consistently and explain its calculation during verification. Do not display zero while eligible customers are ahead.

## Token and customer rules
- Daily tokens use the `S-` prefix and an increasing number (for example, S-1, S-2, S-3).
- Token numbering restarts at 1 each new day.
- One active queue spot is allowed per phone number.
- If the same phone number attempts to join while it already has an active spot, show the existing spot and do not create a duplicate.
- A customer can select a maximum of three services and must select at least one.
- Phone number must contain exactly 10 digits.

## No-show, cancellation and opening rules
- If a customer has been Called but has not arrived within 10 minutes, the receptionist can mark the entry No-show.
- If a No-show customer arrives later, the receptionist adds them again at the end of the queue as a new entry with a new token.
- A customer can cancel only while status is Waiting.
- Online joining closes 30 minutes before salon closing time.
- Walk-ins remain allowed when online joining is closed.
- When the online queue is closed, the Home and Join screens must clearly explain that online joining is unavailable and disable confirmation.

## Synchronization
- Customer status, Reception Dashboard, Barber View and Waiting Area TV should reflect queue changes automatically, targeting an update within five seconds.
- Users should not need to refresh to see a newly joined customer, a call, service start or service completion.
- If synchronization is unavailable, show a connection/stale-data message; do not imply that an update succeeded when it did not.

## Test checklist
- [ ] Join with two services; verify total duration and price are correct.
- [ ] Try to join with zero services; confirmation is blocked with a clear message.
- [ ] Try to select four services; the third-service limit is enforced.
- [ ] Enter a phone number with fewer or more than 10 digits; validation prevents joining.
- [ ] Join with a phone number that already has an active spot; show the existing spot and do not create a duplicate.
- [ ] Call next for Amit when the earliest waiting customer selected Ravi; verify that customer is skipped.
- [ ] Call next for a barber; verify the earliest customer who selected that barber or Any is selected.
- [ ] Verify that a customer who selected a named barber is never assigned to another barber.
- [ ] Call next; verify the customer's phone status and TV display update within five seconds.
- [ ] Start and Done on Barber View; verify Reception and TV update and the completed customer leaves the active queue.
- [ ] Mark a Called customer No-show after the 10-minute grace period; add them again and verify they receive a new token at the end.
- [ ] Cancel a Waiting customer; verify the entry becomes Cancelled and is removed from the active queue.
- [ ] Try to cancel a Called or In Chair customer; verify cancellation is unavailable.
- [ ] Close online joining; verify customer Join/Confirm is disabled with a message while reception can still add a walk-in.
- [ ] Put a barber on break; verify they receive no new assignment and customers with that preference see the break message.
- [ ] Complete services ahead in the queue; verify estimated waiting time decreases and is not incorrectly zero while eligible customers remain.
- [ ] Open customer, reception, barber and TV screens in separate browser windows; verify updates synchronize within five seconds.
- [ ] Verify the English-only interface has no untranslated or overflowing labels on phone, tablet and TV layouts.
