# BookmarkAI: App Flow Document

## Onboarding and Sign-In/Sign-Up

When a new user arrives at the BookmarkAI web application, they are greeted by a clean landing page that briefly highlights the key benefits of intelligent bookmark management. The header provides a prominent button inviting the visitor to sign up or sign in. By clicking "Get Started," the user is redirected to Clerk’s authentication interface. Here, the user can create an account using an email and password or choose a social login option such as Google or GitHub. During sign-up, the user enters their name, email, and password, then confirms their email through a verification link. If they select a social login, they grant permission through the chosen provider, and no further manual input is required.

For returning users, the "Sign In" view allows entry of email and password or social login selection. Forgotten passwords are handled via a "Forgot Password" link. Clicking this link prompts the user to enter their registered email address, which triggers an automated email from Clerk containing a secure reset link. Upon clicking the reset link, the user is taken to a page to set a new password. Once authenticated, Clerk redirects the user back into the application. Signing out is accessible from the user avatar menu in the top-right corner of every page. Selecting "Sign Out" immediately ends the session and returns the user to the landing page.

## Main Dashboard or Home Page

After logging in, the user lands on the main dashboard at the "/bookmarks" route. The dashboard is organized into two primary areas. On the left side, an AppSidebar displays navigation links labeled "Bookmarks," "Organize," and "Settings," plus a branded logo at the top and a user avatar at the bottom. The content area occupies the majority of the screen and begins with a header that includes a search input, an "Add Bookmark" button, and filter controls. Below the header, the central panel renders bookmark entries in a grid of cards. Each card shows the page title, description, favicon, and any associated tags or transcript icon.

The AppSidebar allows quick transitions to different parts of the app. Clicking "Bookmarks" returns the user to this default dashboard view. Selecting "Organize" takes them to the collections and tags management area. Choosing "Settings" opens the account settings page. Every card supports context menu actions for editing, moving to a different collection, or deleting. The search bar filters across titles, descriptions, tags, and transcript availability in real time. These elements ensure that the user can easily navigate between the major sections of BookmarkAI without confusion.

## Detailed Feature Flows and Page Transitions

When the user clicks the "Add Bookmark" button, a modal dialog appears containing a URL input field. After typing or pasting a link, the user presses "Save." Behind the scenes, Next.js Server Actions initiate a metadata extraction process. The server fetches the page content, runs the metadata-extractor utility, and returns structured information. Once the metadata is received, a Convex mutation persists the bookmark data. The modal closes automatically, and the new bookmark card populates the dashboard immediately thanks to Convex’s real-time updates.

To organize bookmarks into collections and tags, the user navigates to the "Organize" section. This page displays two tabs: "Collections" and "Tags." In the "Collections" tab, the user sees a list of existing collections and a button to create a new one. Clicking "New Collection" opens an inline form to name the collection. After saving, the user is returned to the list where they can rename or delete collections. The "Tags" tab offers similar CRUD functionality for tags. Whenever the user applies a collection or tag to a bookmark, they select the item from a dropdown menu on the bookmark card or within the bookmark’s edit form.

If the user clicks on a bookmark card’s edit icon, they enter an edit modal. In this view, the URL field, metadata fields, collection dropdown, and tag checklist are all adjustable. After making changes, pressing "Update" triggers the corresponding Convex update mutation. The card refreshes in place without a full page reload.

For bookmarks linked to video content, the bookmark card may show a transcript icon. Clicking this icon opens a TranscriptViewer modal. When the user first requests a transcript, a Server Action placeholder dispatches to the transcription service integration. In its current state, the modal indicates progress and then displays a placeholder message until a real transcript is available. Once integrated, this flow will fetch and save the transcript in the database, and the viewer will render the text in a scrollable container.

## Settings and Account Management

When the user clicks "Settings" in the sidebar, they land on a page with two main sections: "Profile" and "Preferences." The "Profile" section displays the user’s name and email with an "Edit" button. Selecting this button reveals input fields to modify name or email. After editing, clicking "Save" updates the account in Clerk and refreshes the display. The "Preferences" section allows toggling dark mode and email notification options. Changing preferences takes effect immediately and persists in the user’s profile settings.

Directly within settings, a link labeled "Security" opens a subpage for password management. Here, the user can change their password by entering their current password followed by a new one and confirmation. Clerk handles the validation, and upon success, a confirmation message appears.

To return to the main dashboard after adjusting settings, the user clicks the "Bookmarks" link in the sidebar or uses the branded logo in the header to jump back to the home area.

## Error States and Alternate Paths

Whenever the user enters an invalid URL when adding a bookmark, the form validates input before submission and displays an inline error message reading "Please enter a valid URL." If the metadata extraction process fails due to a network error or unreachable site, a toast notification appears with the message "Unable to fetch metadata. Please try again later." The add bookmark modal remains open so the user can retry or cancel.

If the user loses internet connectivity while interacting with the app, any Convex queries or mutations return errors. In these cases, the UI displays a dismissible banner at the top reading "Connection lost. Reconnecting..." When connectivity returns, the banner disappears and real-time updates resume. For unauthorized access attempts to protected routes, the middleware automatically redirects the user to the sign-in page.

Default 404 and 500 error pages are provided by Next.js. The 404 page offers a button to return to the dashboard if the user is signed in or to the landing page if they are not. The 500 page apologizes for an unexpected error and provides a link to refresh the page.

## Conclusion and Overall App Journey

In summary, a typical user journey begins with landing on the BookmarkAI homepage and creating an account through Clerk’s streamlined sign-up process. Upon signing in, the user arrives at the main dashboard where they can instantly begin saving links. Each new bookmark triggers a metadata extraction flow that enriches the link with title, description, and imagery. From the dashboard, the user organizes bookmarks into collections and tags within the dedicated organize area. They can edit or delete entries in place and preview video transcripts in a modal viewer. Settings allow personalization of profile details and application preferences, and robust error handling guides the user through invalid input or connectivity issues. Throughout every step, real-time updates powered by Convex ensure that the bookmark list remains current without manual refreshes. Ultimately, BookmarkAI empowers users to build, organize, and search a personal library of bookmarks in an intuitive, responsive interface.