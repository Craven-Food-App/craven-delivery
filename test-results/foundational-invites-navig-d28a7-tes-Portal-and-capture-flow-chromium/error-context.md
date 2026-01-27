# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img [ref=e10]
      - heading "CRAVE'N BUSINESS" [level=1] [ref=e13]
      - paragraph [ref=e14]: Partner Portal Access
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]: Email
        - generic [ref=e18]:
          - generic:
            - img
          - textbox "Email" [active] [ref=e19]:
            - /placeholder: Email Address
            - text: tstro
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - generic [ref=e22]:
          - generic:
            - img
          - textbox "Password" [ref=e23]
      - button "Sign In" [ref=e24] [cursor=pointer]:
        - img [ref=e25]
        - text: Sign In
    - generic [ref=e28]:
      - link "Forgot Password?" [ref=e29] [cursor=pointer]:
        - /url: "#"
      - text: "|"
      - link "Need Support?" [ref=e30] [cursor=pointer]:
        - /url: "#"
```