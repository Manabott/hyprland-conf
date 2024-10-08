
import { Notification_ } from "./components/notification";
import { Resources } from "widgets/Resources";
import waifu, { WaifuVisibility } from "./components/waifu";
import { globalMargin, rightPanelExclusivity, rightPanelVisibility, rightPanelWidth, waifuVisibility } from "variables";
import { setOption } from "utils/options";

const Notifications = await Service.import("notifications")

const maxRightPanelWidth = 600;
const minRightPanelWidth = 300;

function WindowActions()
{
    return Widget.Box({
        class_name: "window-actions",
        hpack: "end", spacing: 5
    }, Widget.Button({
        label: "",
        class_name: "expand-window",
        on_clicked: () => rightPanelWidth.value = rightPanelWidth.value < maxRightPanelWidth ? rightPanelWidth.value + 50 : maxRightPanelWidth,
    }), Widget.Button({
        label: "",
        class_name: "shrink-window",
        on_clicked: () => rightPanelWidth.value = rightPanelWidth.value > minRightPanelWidth ? rightPanelWidth.value - 50 : minRightPanelWidth,
    }), WaifuVisibility(),
        Widget.ToggleButton({
            label: "󰐃",
            class_name: "exclusivity",
            onToggled: ({ active }) =>
            {
                rightPanelExclusivity.value = active;
            },
        }).hook(rightPanelExclusivity, (self) => self.active = rightPanelExclusivity.value, "changed"),
        Widget.Button({
            label: "",
            class_name: "close",
            on_clicked: () => rightPanelVisibility.value = false,
        }),
    )


}


interface Filter
{
    name: string
    class: string
}

const notificationFilter = Variable<Filter>({ name: "", class: "" });

function Filter()
{
    const Filters: Filter[] = [{
        name: "Spotify",
        class: "spotify",
    }, {
        name: "Clipboard",
        class: "clipboard",
    }, {
        name: "Update",
        class: "update",
    }];

    return Widget.Box({
        class_name: "filter",
        hexpand: false,
        children: Filters.map(filter =>
        {
            return Widget.Button({
                label: filter.name,
                hexpand: true,
                on_clicked: () => notificationFilter.value = (notificationFilter.value === filter ? { name: "", class: "" } : filter),
                class_name: notificationFilter.bind().as(filter => filter.class),
            })
        })
    })
}





function FilterNotifications(notifications: any[], filter: string): any[]
{
    const filtered: any[] = [];
    const others: any[] = [];

    notifications.forEach((notification: any) =>
    {
        if (notification.app_name.includes(filter) || notification.summary.includes(filter)) {
            filtered.unshift(notification);
        } else {
            others.unshift(notification);
        }
    });
    return [...filtered, ...others].slice(0, 50); // Limit to the last 50 notifications DEFAULT, higher number will slow down the UI
}

const NotificationHistory = () => Widget.Box({
    vertical: true,
    children: Utils.merge([notificationFilter.bind(), Notifications.bind("notifications")], (filter, notifications) =>
    {
        if (!notifications) return [];
        return FilterNotifications(notifications, filter.name)
            .map(notification =>
            {
                return Widget.EventBox(
                    {
                        class_name: "notification-event",
                        on_primary_click: () => Utils.execAsync(`wl-copy "${notification.body}"`).catch(err => print(err)),
                        child: Notification_(notification),
                    });
            })
    }),
})

const Separator = () => Widget.Separator({ vertical: false });

const NotificationsDisplay = Widget.Scrollable({
    class_name: "notification-history",
    hscroll: 'never',
    vexpand: true,
    child: NotificationHistory(),
})

const NotificationPanel = () =>
{
    return Widget.Box({
        class_name: "notification-panel",
        // spacing: 5,
        vertical: true,
        children: [Filter(), NotificationsDisplay, ClearNotifications()],
    })
}


const ClearNotifications = () =>
{
    return Widget.Button({
        class_name: "clear",
        label: "Clear",
        on_clicked: () =>
        {
            NotificationsDisplay.child = Widget.Box({
                vertical: true,
                children: [],
            });
            Notifications.clear()
            // .finally(() => NotificationsDisplay.child = NotificationHistory())
        },
    })
}

function Panel()
{
    return Widget.Box({
        css: rightPanelWidth.bind().as(width => `*{min-width: ${width}px}`),
        vertical: true,
        // spacing: 5,
        children: [WindowActions(), waifu(), Separator(), Resources(), Separator(), NotificationPanel()],
    })
}

const Window = () => Widget.Window({
    name: `right-panel`,
    class_name: "right-panel",
    anchor: ["right", "top", "bottom"],
    exclusivity: "normal",
    layer: "overlay",
    keymode: "on-demand",
    visible: rightPanelVisibility.value,
    child: Panel(),
}).hook(rightPanelExclusivity, (self) =>
{
    self.exclusivity = rightPanelExclusivity.value ? "exclusive" : "normal"
    self.layer = rightPanelExclusivity.value ? "bottom" : "top"
    self.class_name = rightPanelExclusivity.value ? "right-panel exclusive" : "right-panel normal"
    self.margins = rightPanelExclusivity.value ? [0, 0] : [5, globalMargin, globalMargin, globalMargin]
}, "changed").hook(rightPanelVisibility, (self) => self.visible = rightPanelVisibility.value, "changed");

export default () =>
{
    return Window();
}