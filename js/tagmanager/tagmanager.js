/**
 * ===================================================
 * Tag Manager
 * https://tagmanager-tomanderson.rhcloud.com
 * ===================================================
 * Copyright 2012 Soliant Consulting
 * http://www.soliantconsulting.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ==========================================================
 */

$(function() {

    "use strict"; // jshint ;_;

    $.fn.tagManager = function(options) {
        var defaultOptions = {
            strategy: 'array',
            tagFieldName: 'tags[]',
            ajaxCreate: null,
            ajaxDelete: null,
            initialCap: true,
            backspaceChars: [ 8 ],
            delimiterChars: [ 13, 44, 188 ],
            createHandler: function(tagManager, tag, isImport) {
                return;
            },
            deleteHandler: function(tagManager, tag, isEmpty) {
                return;
            },
            createElementHandler: function(tagManager, tagElement, isImport) {
                $(tagManager).before(tagElement);
            },
            validateHandler: function(tagManager, tag, isImport) {
                return tag;
            }
        };

        $.extend(defaultOptions, options);
        $(this).data('options', defaultOptions);
        $(this).data('tagIds', [ ]);
        $(this).data('tagStrings', [ ]);

        /**
         * Bind remove tag icon
         */
        $('a.tagmanagerRemoveTag').live('click', function(e) {
            $($(this).parent().data('tagmanager')).trigger('delete',
                [ $(this).parent() ]);
            return false;
        });

        /**
         * Empty the tag manager
         */
        $(this).on('empty', function(e) {
            var tagmanager = this;
            $($(this).data('tagIds')).each(function(index, value) {
                $(tagmanager).trigger('delete', [ $('#' + value), true ]);
            });
        });

        /**
         * Delete the last tag
         */
        $(this).on('pop', function (e) {
            if ($(this).data('tagIds').length > 0) {
                $(this).trigger('delete', [ $('#' +
                    $(this).data('tagIds')[$(this).data('tagIds').length - 1]) ]);
            }
        });

        /**
         * Delete a tag
         */
        $(this).on('delete', function(e, tagHtml, isEmpty) {

            if ($(this).data('options').deleteHandler)
                $(this).data('options').deleteHandler($(this), $(tagHtml).attr('tag'), isEmpty);

            if ($(this).data('options').strategy == 'ajax' &&
                $(this).data('options').ajaxDelete &&
                !isEmpty) {
                $.ajax({
                    url: $(this).data('options').ajaxDelete,
                    type: 'post',
                    data: {
                        tag: $(tagHtml).attr('tag')
                    },
                    dataType: 'json'
                });
            }

            var index = $.inArray($(tagHtml).attr('id'), $(this).data('tagIds'));
            $(this).data('tagStrings').splice(index, 1);
            $(this).data('tagIds').splice(index, 1);

            $(tagHtml).remove();
        });

        /**
         * Add a new tag
         */
         $(this).on('create', function (e, rawTag, isImport)
         {
            var tag = $.trim(rawTag);
            if (!tag) {
                $(this).val('');
                return;
            }

            // Caps first letter
            if ($(this).data('options').initialCap) {
                tag = tag.charAt(0).toUpperCase() + tag.slice(1);
            }

            // Validate Tag
            tag = $(this).data('options').validateHandler($(this), tag, isImport);
            if (!tag) {
                $(this).val('');
                return;
            }

            // Run ajax
            if ($(this).data('options').strategy == 'ajax' &&
                $(this).data('options').ajaxCreate &&
                !isImport) {
                $.ajax({
                    url: $(this).data('options').ajaxCreate,
                    type: 'post',
                    data: {
                        tag: tag
                    },
                    dataType: 'json'
                });
            }

            // Run create handler
            if ($(this).data('options').createHandler)
                $(this).data('options').createHandler($(this), tag, isImport);

            // Build new tag
            var randomString = function(length) {
                var result = '';
                var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
                return result;
            };

            var tagId = 'tag_' + randomString(32);
            var newTagRemoveId = 'tag_remove_' + tagId;

            $(this).data('tagStrings').push(tag);
            $(this).data('tagIds').push(tagId);

            var tagHtml = $('<span />')
                .addClass('tagmanagerTag')
                .attr('tag', tag)
                .attr('id', tagId)
                .data('tagmanager', this)
                .text(tag);

            // Handle array strategy
            if ($(this).data('options').strategy == 'array') {
                $('<input>')
                    .attr('type', 'hidden')
                    .attr('name', $(this).data('options').tagFieldName)
                    .val(tag)
                    .appendTo(tagHtml);
            }

            // Build remove link
            var tagRemover = $('<a />')
                .addClass('tagmanagerRemoveTag')
                .attr('title', 'Remove')
                .attr('href', '#')
                .text('x')
                .appendTo(tagHtml);

            // Run create element handler
            $(this).data('options').createElementHandler($(this), tagHtml, isImport);

            $(this).val('');
            $(this).focus();
        });

        /**
         * Import prefilled tags without triggering ajaxCreate
         */
        $(this).on('import', function (e, tags) {
            var field = this;

            if (typeof (tags) == "object") {
                $.each(tags, function (key, val) {
                    $(field).trigger('create', [ val, true ]);
                });
            } else if (typeof (tags) == "string") {
                $.each(tags.split(','), function (key, val) {
                    $(field).trigger('create', [ val, true ]);
                });
            }
        });

        /**
         * Prevent submit on enter
         */
        $(this).keypress(function(e) {
            if (e.which == 13 &&
                $.inArray(e.which, $(this).data('options').delimiterChars) != -1) {
                e.stopPropagation();
                e.preventDefault();
            }
        });

        /**
         * If backspace then delete latest tag
         */
        $(this).keydown(function(e) {
            if ($.inArray(e.which, $(this).data('options').backspaceChars) != -1) {
                if (!$(this).val()) {
                    e.preventDefault();
                    $(this).trigger('pop');
                }
            }
        });

        /**
         * If a delimiting key is pressed, add the current value
         */
        $(this).keyup(function (e) {
            if ($.inArray(e.which, $(this).data('options').delimiterChars) != -1) {
                e.preventDefault();

                // If the bootstrap typeahead is active use that value else use field value
                if ($(this).data('typeahead') &&
                    $(this).data('typeahead').shown &&
                    $(this).data('typeahead').$menu.find('.active').length
                ) {
                    return false;
                }

                // For non enter keystrokes trim last character from value
                if (e.which != 13)
                    $(this).val($(this).val().substr(0, $(this).val().length -1));

                $(this).trigger('create', [ $(this).val() ]);
            }
        });
    };
});