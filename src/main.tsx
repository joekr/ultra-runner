import { render } from "preact";
import { App } from "./app";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/screens.css";

render(<App />, document.getElementById("app")!);
