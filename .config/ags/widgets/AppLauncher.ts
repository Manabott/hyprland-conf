import Gdk from "gi://Gdk";
import { readJson, readJSONFile } from "utils/json"
import { emptyWorkspace, globalMargin, newAppWorkspace } from "variables";
import { closeProgress, openProgress } from "./Progress";
import { containsProtocolOrTLD, formatToURL, getDomainFromURL } from "utils/url";
import { arithmetic, containsOperator } from "utils/arithmetic";
const Hyprland = await Service.import('hyprland')

const Results = Variable<{ app_name: string, app_exec: string, app_type: string }[]>([])

function Entry()
{
    let debounceTimeout;

    const help = Widget.Menu({
        children: [
            Widget.MenuItem({
                child: Widget.Label({ xalign: 0, label: '......... \t => \t open app' }),
            }),
            Widget.MenuItem({
                child: Widget.Label({ xalign: 0, label: 'https://... \t => \t open link' }),
            }),
            Widget.MenuItem({
                child: Widget.Label({ xalign: 0, label: '... .com \t => \t open link' }),
            }),
            Widget.MenuItem({
                child: Widget.Label({ xalign: 0, label: '..*/+-.. \t => \t arithmetics' }),
            }),
            Widget.MenuItem({
                child: Widget.Label({ xalign: 0, label: 'emoji ... \t => \t search emojis' }),
            }),
        ],
    })

    return Widget.Box({
        spacing: 5,
        children: [
            Widget.Icon({
                class_name: "icon",
                icon: "preferences-system-search-symbolic"
            }),
            Widget.Entry({
                hexpand: true,
                onChange: async ({ text }) =>
                {
                    clearTimeout(debounceTimeout);

                    // Set a new timeout for 500ms
                    debounceTimeout = setTimeout(async () =>
                    {
                        if (!text) return Results.value = []
                        if (text.includes("emoji"))
                            Results.value = readJSONFile(`${App.configDir}/assets/emojis/emojis.json`).filter(emoji => emoji.app_tags.toLowerCase().includes(text.replace("emoji", "").trim()));
                        else if (containsProtocolOrTLD(text))
                            Results.value = [{ app_name: getDomainFromURL(text), app_exec: `xdg-open ${formatToURL(text)}`, app_type: 'url' }]
                        else if (containsOperator(text))
                            Results.value = [{ app_name: arithmetic(text), app_exec: `wl-copy ${arithmetic(text)}`, app_type: 'calc' }]
                        else
                            Results.value = readJson(await Utils.execAsync(`${App.configDir}/scripts/app-search.sh ${text}`));

                    }, 100); // 100ms delay
                },
                on_accept: () =>
                {
                    ResultsDisplay.child.children[0]?.on_clicked()
                },
            }).on("key-press-event", (self, event: Gdk.Event) =>
            {
                if (event.get_keyval()[1] == 65307) // Escape key
                {
                    self.text = ""
                    App.closeWindow("app-launcher")
                }
            })
            , Widget.Button({
                label: "󰋖",
                class_name: "help",
                on_primary_click: (_, event) =>
                {
                    help.popup_at_pointer(event)
                },
            })
        ]
    })
}

const organizeResults = (results: any[]) =>
{
    const content = (element) => Widget.Box({
        spacing: 10,
        hpack: element.app_type == 'emoji' ? "center" : "start",
        children: element.app_type == 'app' ? [
            Widget.Icon({ icon: element.app_icon || "view-grid-symbolic" }),
            Widget.Label({ label: element.app_name })
        ] : [Widget.Label({ label: element.app_name })]
    })

    const button = (element: any) => Widget.Button({
        hexpand: true,
        child: content(element),
        on_clicked: () =>
        {
            if (element.app_type == "app") {
                openProgress()
                Utils.execAsync(`${App.configDir}/scripts/app-loading-progress.sh ${element.app_name}`)
                    .then((workspace) => newAppWorkspace.value = Number(workspace))
                    .finally(() => closeProgress())
                    .catch(err => Utils.notify({ summary: "Error", body: err }));
            }

            Hyprland.sendMessage(`dispatch exec ${element.app_exec}`)
                .then(() =>
                {
                    switch (element.app_type) {
                        case 'app':
                            Utils.notify({ summary: "App", body: `Opening ${element.app_name}` });
                            break;
                        case 'url':
                            let browser = Utils.exec(`bash -c "xdg-settings get default-web-browser | sed 's/\.desktop$//'"`);
                            Utils.notify({ summary: "URL", body: `Opening ${element.app_name} in ${browser}` });
                            break;
                        default:
                            break;
                    }
                })
                .finally(() => App.closeWindow("app-launcher"))
                .catch(err => Utils.notify({ summary: "Error", body: err }));

        },
    })

    const rows: any[] = []
    const columns: number = results[0].app_type == "emoji" ? 4 : 2

    for (let i = 0; i < results.length; i += columns) {
        const rowResults = results.slice(i, i + columns)
        rows.push(Widget.Box({
            vertical: false,
            spacing: 5,
            children: rowResults.map(element => button(element))
        }))
    }

    return rows
}


const ResultsDisplay = Widget.Box({
    class_name: "results",
    vertical: true,
    children: Results.bind().as(organizeResults),
})


export default () =>
{
    return Widget.Window({
        name: `app-launcher`,
        anchor: emptyWorkspace.as(margin => margin == 1 ? [] : ["top", "left"]),
        exclusivity: "normal",
        keymode: "on-demand",
        layer: "top",
        margins: [5, globalMargin, globalMargin, globalMargin], // top right bottom left
        visible: false,

        child: Widget.EventBox({
            child: Widget.Box({
                vertical: true,
                class_name: "app-launcher",
                children: [Entry(), ResultsDisplay]

            }),
        }),
    })
}
