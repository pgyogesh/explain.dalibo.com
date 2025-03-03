import "./common.js";
import axios from "axios";
import { createApp } from "vue/dist/vue.esm-bundler";
import moment from "moment";
import timeago from "vue-timeago3";
import _ from "lodash";
import $ from "jquery";
import "vite/modulepreload-polyfill";

import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Add all icons to the library
library.add(fas);

const app = createApp({
  data: function () {
    return {
      samples: [
        ["BNL Read", "bnl_read.txt", "bnl_read.sql"],
        ["Aggregation", "aggregate.txt", "aggregate.sql"],
        ["CTE JSON", "cte.json", "cte.sql"],
      ],
      titleInput: "",
      planInput: "",
      queryInput: "",
      draggingPlan: false,
      draggingQuery: false,
      plans: [],
      plan: null,
      planToDelete: null,
      deleteFromServer: false,
    };
  },
  watch: {
    planToDelete: function (newPlan, oldPlan) {
      this.deleteFromServer = false;
    },
  },
  mounted() {
    const textAreas = document.getElementsByTagName("textarea");
    this.loadPlans();
  },
  methods: {
    checkForm(event) {
      this.plan = null;
      event.preventDefault();
      const dontAskAgain = localStorage.getItem("dontAskBeforeSubmit");
      if (dontAskAgain) {
        this.submitPlan();
      } else {
        $("#confirmSubmitModal").modal("show");
      }
    },

    submitPlan() {
      // User don't want to be asked again
      const dontAskAgain = $("#dontAskAgain")[0].checked;
      if (dontAskAgain) {
        localStorage.setItem("dontAskBeforeSubmit", true);
      }

      let plan = this.plan;
      // plan comes from form or from plans list and has never been submitted
      if (!plan) {
        this.titleInput =
          this.titleInput ||
           moment().format("MMMM Do YYYY, h:mm a");
        var createdOn = new Date();
        plan = {
          title: this.titleInput,
          plan: this.planInput,
          query: this.queryInput,
          createdOn: createdOn,
        };
      }
      this.share(plan);
    },

    loadSample(sample) {
      this.titleInput = sample[0];
      axios.get(staticUrl + "samples/" + sample[1]).then((response) => {
        this.planInput = response.request.responseText;
      });
      if (sample[2]) {
        axios.get(staticUrl + "samples/" + sample[2]).then((response) => {
          this.queryInput = response.request.responseText;
        });
      } else {
        this.queryInput = "";
      }
    },

    handleDrop(event) {
      const input = event.srcElement;
      if (!(input instanceof HTMLTextAreaElement)) {
        return;
      }
      this.draggingPlan = false;
      this.draggingQuery = false;
      if (!event.dataTransfer) {
        return;
      }
      const file = event.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (reader.result instanceof ArrayBuffer) {
          return;
        }
        input.value = reader.result || "";
        input.dispatchEvent(new Event("input"));
      };
      reader.readAsText(file);
    },

    loadPlans() {
      var plans = [];
      for (var i in localStorage) {
        if (_.startsWith(i, "plan_")) {
          plans.push(JSON.parse(localStorage[i]));
        }
      }

      this.plans = _.chain(plans).sortBy("createdOn").reverse().value();
    },

    loadPlan(plan) {
      this.plan = plan;
      const dontAskAgain = localStorage.getItem("dontAskBeforeSubmit");
      if (dontAskAgain) {
        this.share(plan);
      } else {
        $("#confirmSubmitModal").modal("show");
      }
    },

    getPlanUrl(plan) {
      return plan.shareId ? "/" + plan.shareId : "#" + plan.id;
    },

    deletePlan(plan) {
      if (this.deleteFromServer && plan.shareId) {
        axios
          .get("/plan/" + plan.shareId + "/" + plan.deleteKey)
          .then(this.onPlanDelete.bind(this, plan));
      } else {
        this.onPlanDelete(plan);
      }
    },

    onPlanDelete(plan) {
      localStorage.removeItem(plan.id ? plan.id : "plan_" + plan.shareId);
      this.loadPlans();
      $("#deletePlanModal").modal("hide");
    },

    share(plan) {
      var form = $("#submitForm")[0];
      axios
        .post(form.action, {
          title: plan.title,
          plan: plan.plan,
          query: plan.query,
        })
        .then((response) => {
          localStorage.removeItem(plan.id);
          var data = response.data;
          const id = "plan_" + data.id;
          localStorage.setItem(
            id,
            JSON.stringify({
              id: id,
              shareId: data.id,
              title: plan.title,
              createdOn: plan.createdOn,
              deleteKey: data.deleteKey,
            })
          );

          // redirect to page with plan from server
          window.location.href = "/plan/" + data.id;
        });
    },
  },
});
app.use(timeago);
app.component("font-awesome-icon", FontAwesomeIcon);
app.mount("#app");
