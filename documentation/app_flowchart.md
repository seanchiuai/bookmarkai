flowchart TD
  Start[User opens app] --> CheckAuth[Authenticate user]
  CheckAuth -->|Not authenticated| ShowLogin[Display login screen]
  ShowLogin -->|User submits credentials| CheckAuth
  CheckAuth -->|Authenticated| Dashboard[Display bookmark dashboard]
  Dashboard --> AddBookmark[Click add bookmark]
  AddBookmark --> InputURL[Show add bookmark form]
  InputURL -->|Submit URL| ExtractMetadata[Invoke metadata extraction]
  ExtractMetadata --> Persist[Persist bookmark in Convex]
  Persist --> Dashboard
  Dashboard --> ManageCollections[Click manage collections]
  ManageCollections --> CollectionsUI[Show collection manager]
  CollectionsUI -->|Save changes| Dashboard
  Dashboard --> ManageTags[Click manage tags]
  ManageTags --> TagsUI[Show tag manager]
  TagsUI -->|Save changes| Dashboard
  Dashboard --> VideoTranscription[Click video transcription placeholder]
  VideoTranscription -->|Placeholder action| Dashboard