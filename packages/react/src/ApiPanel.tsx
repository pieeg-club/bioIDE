import { SANDBOX_API, SANDBOX_HELP, SDK_DOCS } from "@bioide/core";

const GROUPS = [
  { id: "eeg", title: "EEG frame", match: (name: string) => name === "EEG" || name.startsWith("EEG.") },
  { id: "bio", title: "bio helpers", match: (name: string) => name.startsWith("bio.") },
  { id: "io", title: "output", match: (name: string) => !name.startsWith("EEG") && !name.startsWith("bio.") },
];

export function ApiPanel() {
  return (
    <aside className="bioide-api">
      <header className="bioide-api-head">
        <span>API</span>
        <a href={SDK_DOCS} target="_blank" rel="noreferrer">
          JavaScript SDK
        </a>
      </header>
      <p className="bioide-api-lead">
        Mock or Connect, then type <code>EEG.</code> or <code>bio.</code>. Hardware stream and
        band helpers come from the SDK; training helpers live on <code>bio</code>.
      </p>
      <pre className="bioide-api-help">{SANDBOX_HELP}</pre>
      {GROUPS.map((group) => (
        <section key={group.id} className="bioide-api-group">
          <h3>{group.title}</h3>
          <dl>
            {SANDBOX_API.filter((item) => group.match(item.name)).map((item) => (
              <div key={item.name} className="bioide-api-item">
                <dt>
                  <code>{item.apply ?? item.name}</code>
                  <span>{item.detail}</span>
                </dt>
                <dd>{item.info}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </aside>
  );
}
