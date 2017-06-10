'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var Documents = Vue.resource('https://ub-www01.uio.no/colligator/api/documents{/id}', null, {
  saveCover: { method: 'POST', url: 'https://ub-www01.uio.no/colligator/api/documents{/id}/cover' },
  cannotFindCover: { method: 'POST', url: 'https://ub-www01.uio.no/colligator/api/documents{/id}/cannotFindCover' }
}, {
  before: function before(request) {
    if (Documents.previousRequest && Documents.previousRequest.method == 'GET') {
      Documents.previousRequest.abort();
    }
    Documents.previousRequest = request;
  }
});

// Since this is a simple app, we use a global state object rather than Vuex
var GlobalState = new Vue({
  data: function data() {
    return {
      canEdit: false
    };
  }
});

// ---------------------------------------------------------------------------
// EditableCover.vue
// import Documents from 'Documents.vue'
// import GlobalState from 'GlobalState.vue'

var EditableCover = {
  template: '\n    <div>\n      <div v-if="canEdit">\n        <div v-if="!editMode">\n          Omslagsbilde:\n          <span v-if="doc.cover && doc.cover.url">\n            <a :href="doc.cover.url" target="_blank">{{ doc.cover.url.length > 80 ? doc.cover.url.substr(0,80) + \'…\' : doc.cover.url }}</a>\n            <button v-on:click="edit" class="btn btn-default btn-xs">Rediger</button>\n          </span>\n          <span v-else>\n            <button v-on:click="edit" class="btn btn-success btn-xs"> <em class="glyphicon glyphicon-heart"></em> Legg til</button>\n          </span>\n          <span v-if="!doc.cover || !doc.cover.url">\n            <button v-on:click="notFound" class="btn btn-warning btn-xs"> <em class="glyphicon glyphicon-ban-circle"></em> Jeg gir opp</button>\n            <span v-if="doc.cannot_find_cover">\n              {{ doc.cannot_find_cover }} person(er) ga opp å prøve å finne omslagsbilde.\n            </span>\n          </span>\n        </div>\n        <form v-else v-on:submit.prevent="submit" class="form-inline">\n          <div class="form-group">\n            <label :for="\'coverUrl\' + doc.id">Cover:</label>\n            <input type="text" :id="\'coverUrl\' + doc.id" class="form-control input-sm" style="width:600px" v-model="url">\n          </div>\n          <span v-if="busy">\n            Hold on…\n          </span>\n          <span v-else>\n            <button type="button" class="btn btn-default btn-sm" v-on:click="cancel">Avbryt</button>\n            <button type="submit" class="btn btn-primary btn-sm">Lagre</button>\n          </span>\n          <div class="alert alert-danger" role="alert" v-if="errors && errors.length">\n            <div v-for="error in errors">{{ error }}</div>\n          </div>\n        </form>\n      </div>\n      <div v-else style="color:rgb(185, 185, 185); font-size:80%">\n        <em class="glyphicon glyphicon-lock"></em>\n        Du må være på UiO-nett for å redigere\n      </div>\n    </div>\n  ',
  props: {
    doc: Object
  },
  computed: {
    canEdit: function canEdit() {
      return GlobalState.canEdit;
    }
  },
  data: function data() {
    return {
      url: '',
      busy: false,
      errors: [],
      editMode: false
    };
  },
  created: function created() {
    this.url = this.doc.cover ? this.doc.cover.url : '';
  },
  methods: {
    edit: function edit() {
      var _this = this;

      this.editMode = true;

      // Allow Vue to update the DOM before we focus
      setTimeout(function () {
        return document.getElementById('coverUrl' + _this.doc.id).focus();
      });
    },
    cancel: function cancel() {
      this.editMode = false;
      this.url = this.doc.cover ? this.doc.cover.url : '';
    },
    failed: function failed(response) {
      // error callback
      console.log(response);
      if (response.status === 401) {
        this.errors = ['Ingen tilgang: ' + response.body];
      } else {
        this.errors = ['Save failed because of network or server issues.'];
      }
      if (response.status === 422) {
        this.errors = Object.keys(response.body).map(function (k) {
          return response.body[k][0];
        });
        console.log(this.errors);
      }
      this.busy = false;
    },
    notFound: function notFound() {
      var _this2 = this;

      if (this.busy) {
        return;
      }
      this.busy = true;
      this.errors = [];
      Documents.cannotFindCover({ id: this.doc.id }, {}).then(function (response) {
        _this2.busy = false;
        if (response.body.result !== 'ok') {
          _this2.errors = [response.body.error];
          return;
        }
        _this2.doc.cannot_find_cover = response.body.cannot_find_cover;
      }, this.failed.bind(this));
    },
    submit: function submit() {
      var _this3 = this;

      if (this.busy) {
        return;
      }
      this.busy = true;
      this.errors = [];
      Documents.saveCover({ id: this.doc.id }, { url: this.url }).then(function (response) {
        _this3.busy = false;
        if (response.body.result !== 'ok') {
          _this3.errors = [response.body.error];
          return;
        }
        _this3.doc.cover = response.body.cover;
        _this3.editMode = false;
      }, this.failed.bind(this));
    }
  }
};

// ---------------------------------------------------------------------------
// Document.vue
// import EditableCover from 'EditableCover.vue'

var Document = {
  template: '\n    <li class="list-group-item">\n      <div>\n        <img v-if="doc.cover" :src="doc.cover.thumb.url" style="width: 100px;" />\n        <div>\n          <h3>{{ doc.title }} <span style="color:#018D83">({{doc.year}})</span></h3>\n          <p v-if="doc.description">{{ doc.description }}</p>\n          ISBN: <span v-for="isbn in doc.isbns"> {{ isbn }} </span>\n          <div v-for="holding in localHoldings">\n            {{ holding.barcode }} :\n            {{ holding.callcode }}\n          </div>\n          <editable-cover :doc="doc"></editable-cover>\n        </div>\n      </div>\n    </li>\n  ',
  props: {
    doc: Object
  },
  computed: {
    localHoldings: function localHoldings() {
      return this.doc.holdings.filter(function (holding) {
        return holding.shelvinglocation === 'k00475';
      });
    }
  },
  components: {
    'editable-cover': EditableCover
  }
};

// ---------------------------------------------------------------------------
// Search.vue
// import GlobalState from 'GlobalState.vue'

var Search = {
  template: '\n    <div>\n      <form v-on:submit.prevent="submitForm" class="form-inline">\n        Søk med <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">ElasticSearch query string syntax</a>:\n        <div class="row">\n          <div class="col-md-10">\n            <input v-model="query" class="form-control" style="width:100%">\n          </div>\n          <div class="col-md-2">\n            <button type="submit" class="btn btn-primary" style="width:100%">Search</button>\n          </div>\n        </div>\n        <p style="margin-top:.4em">\n          Du kan f.eks. søke etter\n          <router-link :to="{ path: \'/search\', query: { q: \'collections:&quot;samling42&quot; AND _missing_:cover AND cannot_find_cover:0\' }}">\n            dokumenter i 42-samlingen som mangler omslagsbilde\n          </router-link>\n          eller\n          <router-link :to="{ path: \'/search\', query: { q: \'cover.created:&quot;\' + today + \'&quot;\' }}">\n            dokumenter som har fått omslagsbilde i dag\n          </router-link>\n        </p>\n      </form>\n      <router-view></router-view>\n    </div>\n  ',
  created: function created() {
    console.log('Hello, Search created');
    this.getQueryString();
    this.checkIp();
  },
  watch: {
    // call again the method if the route changes
    '$route': function $route() {
      this.getQueryString();
    }
  },
  data: function data() {
    return {
      query: '',
      today: new Date().toISOString().substr(0, 10)
    };
  },
  methods: {
    submitForm: function submitForm() {
      this.$router.push({ path: '/search', query: { q: this.query } });
    },
    getQueryString: function getQueryString() {
      this.query = this.$route.query.q;
    },
    checkIp: function checkIp() {
      this.$http.get('https://ub-www01.uio.no/colligator/api/ipcheck').then(function (response) {
        GlobalState.canEdit = true;
      }, function (response) {
        GlobalState.canEdit = false;
      });
    }
  }
};

// ---------------------------------------------------------------------------
// SearchResults.vue
// import Document from 'Document.vue'
// import Documents from 'Documents.vue'

var SearchResults = {
  template: '\n    <div>\n      <div v-show="!busy && !error">Got {{ documents.length }} of {{ totalResults }} results</div>\n      <div v-show="error" class="alert alert-danger">{{ error }}</div>\n      <ul class="list-group">\n        <document :doc="doc" v-for="doc in documents" :key="doc.id"></document>\n      </ul>\n      <div v-show="busy">Henter...</div>\n      <button v-on:click="more()" v-show="!busy && documents.length < totalResults" class="btn btn-default">Hent flere</button>\n    </div>\n  ',
  created: function created() {
    console.log('Hello, SearchResults created');
    this.fetchResults();
  },
  watch: {
    // call again the method if the route changes
    '$route': function $route() {
      this.fetchResults();
    }
  },
  components: {
    'document': Document
  },
  data: function data() {
    return {
      documents: [],
      from: 0,
      totalResults: 0,
      busy: true,
      error: ''
    };
  },
  methods: {
    more: function more() {
      this.fetchResults(this.from);
    },
    fetchResults: function fetchResults(from) {
      var _this4 = this;

      if (!from) {
        from = 0;
        this.documents = [];
      }
      this.busy = true;
      console.log('Searching for: ' + this.$route.query.q);

      this.error = '';
      Documents.get({ q: this.$route.query.q, offset: from }).then(function (response) {
        _this4.error = '';
        if (_typeof(response.body) != 'object') {
          _this4.error = 'Server returned non-JSON response';
          _this4.busy = false;
          return;
        }
        response.body.documents.forEach(function (doc) {
          if (!doc.cannot_find_cover) {
            // Initialize with default value since Vue cannot detect property addition or deletion
            // https://vuejs.org/v2/guide/reactivity.html
            doc.cannot_find_cover = 0;
          }
          _this4.documents.push(doc);
          _this4.from++;
        });
        _this4.totalResults = response.body.total;
        _this4.busy = false;
      }, function (response) {
        // error callback
        console.log(response);
        _this4.error = 'Sorry, an error occured';
        _this4.busy = false;
      });
    }
  }
};

// ---------------------------------------------------------------------------

// main.js
// import Vue from 'vue'
// import VueRouter from 'vue-router'
// import Search from 'Search.vue'
// import SearchResults from 'SearchResults.vue'

var router = new VueRouter({
  routes: [{
    path: '/',
    component: Search,
    children: [{
      path: 'search',
      component: SearchResults
    }]
  }]
});

// mount a root Vue instance
new Vue({ router: router }).$mount('#app');